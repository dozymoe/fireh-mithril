import localForage from 'localforage';


export class LocalForageCacheStorage
{
    constructor(namespace)
    {
        this._store = localForage.createInstance({
            name: 'cache-storage.' + (namespace || 'default'),
            size: 4980736,
        });
    }

    async get(key)
    {
        return await this._store.getItem(key);
    }

    async set(key, value)
    {
        await this._store.setItem(key, value);
    }

    async size(key, value)
    {
        return (await this._store.keys()).length;
    }

    async remove(key)
    {
        let item = await this._store.getItem(key);
        await this._store.removeItem(key);
        return item;
    }

    async keys()
    {
        return await this._store.keys();
    }
}
