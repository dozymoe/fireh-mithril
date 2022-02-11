import { isArray, isNull, isUndefined, omit, pick, zipObject } from 'lodash';


export class Model
{
    _date_fields = [];
    _datetime_fields = ['created_at', 'updated_at'];
    _model_fields = {};
    _non_recursive_model_fields = [];
    _blob_fields = [];
    _readonly_fields = [];
    _id_field = null;

    _cache = null;
    _queue = null;
    _date_processor = null;

    getName()
    {
        return this._alias || this._name;
    }

    reset(props, options)
    {
        if (!props) props = {};
        if (!options) options = {};
        // Measure to prevent exhausting memory because recursive creation of
        // model fields.
        if (isUndefined(options.initModels)) options.initModels = true;

        for (const field in this)
        {
            if (field.startsWith('_')) continue;
            if (field in props)
            {
                this[field] = props[field];
            }
            else if (field in this._model_fields)
            {
                this[field] = new this._model_fields[field]();
                if (options.initModels)
                {
                    this[field].reset(
                        null,
                        {
                            // Prevent exhausting memory because recursive
                            // creation of model fields.
                            initModels: this._non_recursive_model_fields
                                .indexOf(field) === -1,
                        }
                    );
                }
            }
            else
            {
                this[field] = null;
            }
        }
        return this;
    }

    async getCache(key)
    {
        if (!this._cache) return;
        return await this._cache.getItem(key);
    }

    async setCache(key, value, options)
    {
        if (!this._cache) return;
        if (isUndefined(options))
        {
            // will expire in 4 hour
            options = {expirationSliding: 4 * 3600};
        }
        await this._cache.setItem(key, value, options);
    }

    async removeObjectCache(key)
    {
        if (!this._cache) return;
        await this._cache.removeItem(this.getObjectCacheKeyName(key));
    }

    getObjectCacheKeyName(key)
    {
        let id = this.getId();
        let cacheKey = this.getName() + ':' + this.getIdEncoded();
        return key ? cacheKey + ':' + key : cacheKey;
    }

    async getObjectCache(key)
    {
        return await this.getCache(this.getObjectCacheKeyName(key));
    }

    async setObjectCache(key, value, options)
    {
        await this.setCache(this.getObjectCacheKeyName(key), value, options);
    }

    async localUpdate(values)
    {
        // This method does not update the object, only the cached data.
        let stored = await this.getObjectCache() || {};
        Object.assign(stored, values);
        await this.setObjectCache(null, stored);
        return this;
    }

    async fetch(options)
    {
        let id = this.getId();
        if (isUndefined(id) || isNull(id) || id === '')
        {
            return this;
        }
        if (!options) options = {}
        if (isUndefined(options.fetchRelated))
        {
            options.fetchRelated = true;
        }
        if (isUndefined(options.waitRelated))
        {
            options.waitRelated = false;
        }

        let record = !this._cache || options.ignoreCache ? null
                : await this.getObjectCache();
        if (record)
        {
            this.deserialize(record);
        }
        else if (this._queue && !options.queued)
        {
            // Queue to reduce http requests for the same objects.
            return await new Promise((resolve, reject) =>
                    {
                        let options = {...options, queued: true};
                        this._queue.push(() => this.fetch(options).then(
                                resolve, reject));
                    });
        }
        else
        {
            record = await this.backendFetch();
            if (record)
            {
                this.deserialize(record);
                await this.localUpdate(record);
            }
        }
        if (record && options.fetchRelated)
        {
            let options = omit(options, ['queued']);
            if (options.waitRelated)
            {
                await this.fetchRelated(options);
            }
            else
            {
                this.fetchRelated(options);
            }
        }
        return this;
    }

    deserialize(props)
    {
        for (const field in this)
        {
            if (field.startsWith('_')) continue;
            const value = props[field];
            if (isUndefined(value)) continue;

            if (field in this._model_fields)
            {
                let obj = this[field];
                if (isArray(obj._id_field))
                {
                    let id = atob(value).split(',');
                    obj.reset(
                        null,
                        {
                            // Prevent exhausting memory because recursive
                            // creation of model fields.
                            initModels: this._non_recursive_model_fields
                                .indexOf(field) === -1,
                        }
                    ).deserialize(zipObject(obj._id_field, id));
                }
                else
                {
                    obj.reset(
                        {[obj._id_field]: value},
                        {
                            // Prevent exhausting memory because recursive
                            // creation of model fields.
                            initModels: this._non_recursive_model_fields
                                .indexOf(field) === -1,
                        }
                    );
                }
            }
            else if (this._date_processor &&
                    this._datetime_fields.indexOf(field) !== -1)
            {
                this[field] = this._date_processor.deserializeDateTime(value);
            }
            else if (this._date_processor &&
                    this._date_fields.indexOf(field) !== -1)
            {
                this[field] = this._date_processor.deserializeDate(value);
            }
            else
            {
                this[field] = value;
            }
        }
        return this;
    }

    serialize()
    {
        var result = {};
        for (const field in this)
        {
            if (field.startsWith('_')) continue;
            const value = this[field];
            if (isUndefined(value)) continue;

            if (field in this._model_fields)
            {
                let id = value.getId();
                if (isArray(id))
                {
                    result[field] = btoa(id.map((item) =>
                            item ? item.toString() : '').join());
                }
                else
                {
                    result[field] = id;
                }
            }
            else if (this._date_processor &&
                    this._datetime_fields.indexOf(field) !== -1)
            {
                result[field] = this._date_processor.serializeDateTime(value);
            }
            else if (this._date_processor &&
                    this._date_fields.indexOf(field) !== -1)
            {
                result[field] = this._date_processor.serializeDate(value);
            }
            else
            {
                result[field] = value;
            }
        }
        return result;
    }

    prepareState(props)
    {
        var state = {};
        for (const field in this)
        {
            if (field.startsWith('_')) continue;
            const value = this[field];
            if (value === null || isUndefined(value))
            {
                value = '';
            }
            state[field] = value;
        }
        if (props) Object.assign(state, props);
        return state;
    }

    async fetchRelated(options)
    {
        var defs = [];
        for (const field in this._model_fields)
        {
            defs.push(this[field].fetch(options));
        }
        await Promise.all(defs);
    }

    getId()
    {
        let values = this.serialize();
        if (isArray(this._id_field))
        {
            let result = [];
            // Must have the right fields' values order.
            this._id_field.forEach(function(field)
            {
                if (isUndefined(values[field]))
                {
                    result.push(null);
                }
                else
                {
                    result.push(values[field]);
                }
            });
            return result.length ? result : undefined;
        }
        return values[this._id_field];
    }

    getIdField()
    {
        return this._id_field;
    }

    static GetIdField()
    {
        return (new this())._id_field;
    }

    getIdEncoded()
    {
        let id = this.getId();

        if (id === undefined)
        {
            return '';
        }
        else if (isArray(id))
        {
            return btoa(id.map((item) => item ? item.toString() : '').join());
        }
        return id.toString();
    }

    pickId(values)
    {
        let id_field = isArray(this._id_field) ? this._id_field
                : [this._id_field];

        if (isUndefined(values))
        {
            return pick(this, id_field);
        }
        return pick(values, id_field);
    }

    async loadFromData(values, options)
    {
        this.reset().deserialize(this.pickId(values));
        await this.localUpdate(values);
        return await this.fetch(options);
    }

    static LoadFromData(values, options)
    {
        return (new this()).loadFromData(values, options);
    }

    async loadFromId(value, options)
    {
        if (!value)
        {
            this.reset();
            return this;
        }
        if (isArray(this._id_field))
        {
            let id = atob(value).split(',');
            this.reset().deserialize(zipObject(this._id_field, id));
        }
        else
        {
            this.reset({[this._id_field]: value});
        }
        return await this.fetch(options);
    }

    static LoadFromId(values, options)
    {
        return (new this()).loadFromId(values, options);
    }

    isValid()
    {
        if (isArray(this._id_field))
        {
            for (let field of this._id_field)
            {
                if (!this[field]) return false;
            }
            return true;
        }
        return !!this[this._id_field];
    }

    async backendFetch() {}
}


/**
 * When you have a synchronous callback that create the same model instance
 * over and over, and that triggers rerender, and that rerender recreate
 * that model instance.
 * Weird loop.
 *
 * Notice that all the methods are synchronous.
 */
export class ModelEmergencyCache
{
    constructor(model)
    {
        this.cache = {};
        this.model = model;
        this._id_field = model.GetIdField();
    }

    getId(values)
    {
        if (isArray(this._id_field))
        {
            let result = [];
            // Must have the right fields' values order.
            this._id_field.forEach(function(field)
            {
                if (isUndefined(values[field]))
                {
                    result.push(null);
                }
                else
                {
                    result.push(values[field]);
                }
            });
            return result.length ? result : undefined;
        }
        return values[this._id_field];
    }

    getIdEncoded(values)
    {
        let id = this.getId(values);

        if (id === undefined)
        {
            return '';
        }
        else if (isArray(id))
        {
            return btoa(id.map((item) => item ? item.toString() : '').join());
        }
        return id.toString();
    }

    pickId(values)
    {
        let id_field = isArray(this._id_field) ? this._id_field
                : [this._id_field];
        return pick(values, id_field);
    }

    loadFromData(values, options)
    {
        let key = this.getIdEncoded(values);
        if (this.cache[key])
        {
            return this.cache[key];
        }
        let obj = new this.model().reset().deserialize(this.pickId(values));
        this.cache[key] = obj;
        obj.localUpdate(values).then(() => obj.fetch(options));
        return obj
    }
}
