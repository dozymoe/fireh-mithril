import { merge } from 'lodash';
import m from 'mithril/hyperscript';
import m_mount from 'mithril/mount';
import m_route from 'mithril/route';
import { isNativeClass } from 'typechecker';

export function initialize_app(app, props, initializations, options)
{
    merge(app, props);
    options = options || {};

    // Initialize singletons
    if (options.history !== 'hash')
    {
        m_route.prefix = '';
    }

    // Call "initializations" with the app as first argument.
    for (let init of initializations)
    {
        init(app, options);
    }
}


export function run(app, components, routes, element, options)
{
    options = options || {};

    // Install "routes" on "element".
    if (element && routes && routes.length)
    {
        let router = {};
        for (let r of routes)
        {
            router[r.path] = new r.component(app);
        }
        router['/:404...'] = {view: () => ''};
        m_route(element, null, router);
    }
    // Mount "components" to their own css selectors.
    for (let c of components)
    {
        if (c.selector)
        {
            for (let el of document.querySelectorAll(c.selector))
            {
                if (isNativeClass(c.component))
                {
                    m_mount(el, new c.component(app));
                }
                else
                {
                    c.component(el, app);
                }
            }
        }
        else
        {
            app.components.push(c);
        }
    }
}
