import m from 'mithril/hyperscript';
import { find, matches } from 'lodash';


export class ApplicationStorage {
    components = [];

    /**
     * Reverse route names into urls.
     *
     * Replace/patch this method with your own.
     */
    route(name, params, query, options)
    {
        return '/';
    }

    /**
     * Replace/patch this method with your own.
     */
    alert(message, options)
    {
        console.error(message);
    }

    /**
     * Given model name (a string) and view name (a string), find and render the
     * related Component in the property: components.
     *
     * An example would be if the server gave you a model data and how it should
     * be rendered, dynamically.
     */
    renderComponent(model, view, props)
    {
        let meta = find(this.components, matches({model: model, view: view}));
        return meta ? m(new meta.component(app), props) : null;
    }
}
