=============
Fireh Mithril
=============

Summary
-------

Simple mithril framework.


Usage
-----

.. code-block:: javascript
   :linenos:

    import { create_application, run } from './fireh-mithril/core/application.js';

    const initializations = [
    ];

    const components = [
    ];

    const pages = [
    ];

    function onload()
    {
        let app = create_application({ name: "My App" }, initializations);
        run(app, components, pages, document.getElementById('js_app'));
    }
    if (document.readyState !== 'loading') setTimeout(onload, 0);
    else document.addEventListener('DOMContentLoaded', onload);

