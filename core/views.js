import { debounce, forOwn, isEmpty, isUndefined, merge, pick, uniqueId
       } from 'lodash';
import m from 'mithril/hyperscript';
import m_mount from 'mithril/mount';
import m_render from 'mithril/render';
//-
import { blob2bin } from './msgbus.js';


export class NullStore
{
    constructor(values)
    {
        Object.assign(this, values);
    }

    getState()
    {
        return this;
    }

    setState(values)
    {
        Object.assign(this, values);
    }
}

export function createNullStore(values)
{
    return new NullStore(values);
}


const ERROR_MESSAGES = ['info', 'warning', 'error']

export class ErrorMessageView
{
    _renderUl(arr, className)
    {
        if (!isEmpty(arr))
        {
            return m(`ul.alert.alert-${className}`,
                {role:'alert'},
                ...arr.map(x => m('li', m.trust(x))))
        }
    }

    has(store, field)
    {
        let { _errmsg_info, _errmsg_warning, _errmsg_error } = store.getState();
        return _errmsg_info[field] || _errmsg_warning[field] ||
                _errmsg_error[field];
    }

    view(vnode)
    {
        let data = {};
        const field = vnode.attrs.field;
        const state = vnode.attrs.store.getState();
        const delete_field = vnode.attrs.errmsg_delete_field;

        if (field)
        {
            delete_field(field);
        }
        for (let key of ERROR_MESSAGES)
        {
            let errors = state['_errmsg_' + key];
            for (let errfield in errors)
            {
                if (field)
                {
                    if (errfield !== field) continue;
                }
                else if (state._errmsg_done_fields.indexOf(errfield) !== -1)
                {
                    continue;
                }
                let arr = errors[errfield];
                if (field)
                {
                    data[key] = arr;
                }
                else
                {
                    if (!data[key]) data[key] = [];

                    if (errfield && errfield !== '_')
                    {
                        for (let message of arr)
                        {
                            data[key].push(errfield + ': ' + message);
                        }
                    }
                    else
                    {
                        data[key].push(...arr);
                    }
                }
            }
        }
        return m.fragment({},
            this._renderUl(data.error, 'danger'),
            this._renderUl(data.warning, 'warning'),
            this._renderUl(data.info, 'info'));
    }
}

export ErrorMessageActions =
{
    errmsg_clear()
    {
        return {
            _errmsg_info: {},
            _errmsg_warning: {},
            _errmsg_error: {},
            _errmsg_done_fields: [],
        }
    }

    errmsg_delete_field(state, field)
    {
        return {
            _errmsg_done_fields: [field, ...state._errmsg_done_fields],
        }
    }

    errmsg_undelete()
    {
        return {_errmsg_done_fields: []}
    }

    errmsg_apply(state, messages)
    {
        let newstate = {}
        for (let key of ERROR_MESSAGES)
        {
            if (isEmpty(messages[key])) return;
            newstate['_errmsg_' + key] = messages[key];
        }
        return newstate
    }
}


export class PageActions
{
    constructor(app)
    {
        this.app = app;
    }

    onInputChange(state, event)
    {
        const target = event.target;
        const value = target.type === 'checkbox' ? target.checked
                : target.value;
        return {[target.name]: value};
    }

    async onFileInputChange(state, event)
    {
        const target = event.target;
        var value = '';
        if (target.files[0])
        {
            value = await blob2bin(target.files[0]);
        }
        return {[target.name]: value};
    }

    async onSubmit(state, event)
    {
        if (event) event.preventDefault();
        this.errmsg_clear();
        this.setState({state: 'loading'});
        try
        {
            const response = await this.performSubmit();
            this.persistState();
            if (response.status >= 500)
            {
                app.alert("Server Error!");
            }
            else if ([400, 409, 422].includes(response.status))
            {
                this.setState({state: null});
                this.errors.apply(await response.json());
            }
            else if (response.status === 403)
            {
                location.href = create_abspath_url(app.route('login'),
                        {next: location.href});
            }
            else if (this.redirectNext !== null)
            {
                const qs = new URLSearchParams(location.search);
                location.href = qs.get('next') || this.redirectNext;
            }
            else
            {
                this.setState({state: null});
            }
        }
        catch(error)
        {
            this.setState({state: null});
            console.log(error.stack);
            this.props.app.alert(error.message);
        }
    }
}

export class Page
{
    redirectNext = '/'
    redirectPrev = '/'

    constructor(app, store)
    {
        this.app = app;
        this.store = store;
        this.store.setState({state: ''});
        this.errors = new ErrorMessages();

        this.onSubmit = this.onSubmit.bind(this);
        this.onCancel = this.onCancel.bind(this);
        this.set = this.set ? this.set.bind(this) : this._set.bind(this);
        this.lazyRefresh = debounce(this.refresh.bind(this), 500);
    }


    async onSubmit(event)
    {
        const app = this.props.app;
        if (event) event.preventDefault();
        this.errors.clear();
        this.setState({state: 'loading'});
        try
        {
            const response = await this.performSubmit();
            this.persistState();
            if (response.status >= 500)
            {
                app.alert("Server Error!");
            }
            else if ([400, 409, 422].includes(response.status))
            {
                this.setState({state: null});
                this.errors.apply(await response.json());
            }
            else if (response.status === 403)
            {
                location.href = create_abspath_url(app.route('login'),
                        {next: location.href});
            }
            else if (this.redirectNext !== null)
            {
                const qs = new URLSearchParams(location.search);
                location.href = qs.get('next') || this.redirectNext;
            }
            else
            {
                this.setState({state: null});
            }
        }
        catch(error)
        {
            this.setState({state: null});
            console.log(error.stack);
            this.props.app.alert(error.message);
        }
    }

    onCancel(event)
    {
        event.preventDefault();
        const qs = new URLSearchParams(location.search);
        this.props.app.history.push(qs.get('prev') || this.redirectPrev);
    }

    async refresh(event)
    {
        const pageURL = location.pathname
                + (location.search ? location.search : '')
                + (location.hash ? '#' + location.hash : '');

        if (event) event.preventDefault();

        this.setState({
            state: 'loading',
            prevQuery: 'prev=' + encodeURIComponent(pageURL),
        });
        try
        {
            await this.performRefresh();
            this.persistState();
        }
        catch(error)
        {
            console.log(error.stack);
            this.props.app.alert(error.message);
        }
        finally
        {
            this.setState({state: null});
        }
    }

    setPageMeta(options)
    {
        if (options.title)
        {
            window.title = options.title;
        }
    }

    _set(event)
    {
        event.preventDefault();
        let el = event.target;
        this.setState({[el.name]: el.value});
    }
}


export class Form
{
    constructor(app)
    {
        this.app = app;
        this.id = uniqueId('form_');

        this.onInputChange = this.onInputChange.bind(this);
        this.onFileInputChange = this.onFileInputChange.bind(this);
        if (this.onSubmit)
        {
            this.onSubmit = this.onSubmit.bind(this);
        }
    }

    onInputChange(event)
    {
        const target = event.target;
        const value = target.type === 'checkbox' ? target.checked
                : target.value;
        this.setState({[target.name]: value});
    }

    async onFileInputChange(event)
    {
        const target = event.target;
        var value = '';
        if (target.files[0])
        {
            value = await blob2bin(target.files[0]);
        }
        this.setState({[target.name]: value});
    }
}


export class AjaxForm extends Form
{
    constructor(app)
    {
        super(app);
        this.state = {state: ''};
        this.errors = new ErrorMessages();

        this.onCancel = this.onCancel.bind(this);
    }

    async onSubmit(event)
    {
        const app = this.props.app;
        event.preventDefault();
        this.errors.clear();
        this.setState({state: 'loading'});
        try
        {
            const response = await this.performSubmit();
            if (response.status >= 500)
            {
                app.alert("Server Error!");
            }
            else if ([400, 409, 422].includes(response.status))
            {
                this.setState({state: null});
                this.errors.apply(await response.json());
            }
            else if (response.status === 403)
            {
                location.href = create_abspath_url(app.route('login'),
                        {next: location.href});
            }
            else
            {
                this.setState({state: null});
                this.submit(await response.json());
            }
        }
        catch(error)
        {
            this.setState({state: null});
            console.log(error.stack);
            this.props.app.alert(error.message);
        }
    }

    onCancel(event)
    {
        event.preventDefault();
        this.cancel();
    }
}


let modalLevel = 0;

function onHideModal()
{
    m_mount(document.getElementById('js_modal-' + modalLevel), null);
    modalLevel -= 1;
}

export function showModal(Component, props, app)
{
    modalLevel += 1;

    return new Promise(function(resolve, reject)
    {
        m_render(document.getElementById('js_modal-' + modalLevel),
                m(new Component(app), {onHide: onHideModal, resolve: resolve,
                    reject: reject, show: true, ...props}));

    });
}
