import { isArray, isEmpty, isUndefined } from 'lodash';


export function create_querystring(query, search)
{
    let qs = new URLSearchParams(search);
    if (query instanceof FormData)
    {
        query = new URLSearchParams(query)
    }
    if (query instanceof URLSearchParams)
    {
        for (const key of query.keys())
        {
            qs.set(key, query.getAll(key));
        }
    }
    else
    {
        for (const key in query)
        {
            const value = query[key];
            if (isUndefined(value))
            {
                qs.delete(key);
            }
            else if (isArray(value))
            {
                qs.delete(key);
                for (let ii = 0; ii < value.length; ii++)
                {
                    qs.append(key, value[ii]);
                }
            }
            else
            {
                qs.set(key, value);
            }
        }
    }
    return qs.toString();
}


function _create_url(path, query, options)
{
    var url = new URL(location.href);
    if (query === null || (options && options.resetQuery))
    {
        url.search = '';
    }
    if (path)
    {
        url = new URL(path, url);
    }
    if (!isUndefined(query))
    {
        url.search = create_querystring(query, url.search);
    }
    return url;
}

export function create_url(path, query, options)
{
    return _create_url(path, query, options).href;
}

export function create_abspath_url(path, query, options)
{
    const url = _create_url(path, query, options);
    return url.pathname + url.search + url.hash;
}
