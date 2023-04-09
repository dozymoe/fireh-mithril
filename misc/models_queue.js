import Queue from 'queue';

const _queue = new Queue({concurrency: 8, autostart: true});

export default function queue()
{
    return _queue;
}

