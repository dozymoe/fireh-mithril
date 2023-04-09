import { Cache } from './cache.js';
import { LocalForageCacheStorage } from './cache_storage-localforage.js';

const _cache = new Cache(-1, false, new LocalForageCacheStorage());


export default function cache()
{
    return _cache;
}
