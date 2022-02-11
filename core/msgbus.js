import SHA1 from 'js-sha1';
import { merge } from 'lodash';
import { delay } from '../misc/helper.js';


export function blob2bin(blob)
{
    return new Promise(function(resolve, reject)
    {
        const reader = new FileReader();
        reader.addEventListener('loadend', function()
        {
            resolve(reader.result);
        });
        reader.readAsBinaryString(blob);
    });
}


export class MessageBus
{
    constructor(url, options, options_callback)
    {
        this.url = url;
        this.options = {
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            retry: 3,
            retryInterval: 3000,
        };
        merge(this.options, options || {});
        this.prepare_options = options_callback;

        this.headers = {};
    }

    async delete()
    {
        return await this.fetch('DELETE');
    }

    async fetch(method)
    {
        let options = {
            method: method,
            headers: this.options.headers,
        };
        merge(options.headers, this.headers);
        if (method !== 'GET' && method !== 'HEAD')
        {
            options.body = this.body;
        }
        if (this.prepare_options)
        {
            this.prepare_options(options);
        }

        let error;
        for (let ii = 0; ii < this.options.retry; ii++)
        {
            try
            {
                return await fetch(this.url, options);
            } catch (err)
            {
                error = err;
                await delay(this.options.retryInterval);
            }
        }
        throw error;
    }

    async get()
    {
        return await this.fetch('GET');
    }

    async head()
    {
        return await this.fetch('HEAD');
    }

    json(data)
    {
        this.body = JSON.stringify(data);
        this.headers['Content-Type'] = 'application/json';
        return this;
    }

    body(values)
    {
        this.body = values;
        return this;
    }

    async chunks(name, file, values)
    {
        this.fieldName = name;
        this.file = file;
        this.formValues = values;
        this.isChunked = true;

        let sha1 = SHA1.create();
        let dest = new WritableStream({write(raw) { sha1.update(raw); }});
        await file.stream().pipeTo(dest);
        return sha1.hex();
    }

    postChunks(resolve, reject)
    {
        let chunkSize = this.options.chunkSize || (64 * 1024);
        let parts = [], start = 0;
        for (let ii = 0; ii < Math.floor(this.file.size / chunkSize); ii++)
        {
            parts.push([start, start + chunkSize]);
            start += chunkSize;
        }
        parts.push([start, start + (this.file.size % chunkSize)]);

        let promises = [];
        for (let [start, end] of parts)
        {
            let client = msgbus(this.url, this.options, this.prepare_options);
            let blob = this.file.slice(start, end);
            let reader = new FileReader();
            reader.onload = (event) =>
            {
                let form = new FormData();
                form.append('offset', start);
                form.append(this.fieldName, new Blob([event.target.result]));
                for (let key in this.formValues || {})
                {
                    form.append(key, values[key]);
                }

                promises.push(client.body(form).post()
                        .then(() =>
                        {
                            if (this.options.callback)
                            {
                                this.options.callback(end - start);
                            }
                        }));
            };
            reader.readAsArrayBuffer(blob);
        }

        Promise.all(promises).then(resolve, reject);
    }

    async post()
    {
        if (this.isChunked)
        {
            return new Promise(this.postChunks.bind(this));
        }
        return await this.fetch('POST');

    }

    async put()
    {
        return await this.fetch('PUT');
    }

    redirect(value)
    {
        // value could be: follow, manual, error
        this.options.redirect = value;
        return this;
    }
}


export function msgbus(url, options, options_callback)
{
    return new MessageBus(url, options, options_callback);
}
