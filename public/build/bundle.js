
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn, basedir, module) {
    	return module = {
    	  path: basedir,
    	  exports: {},
    	  require: function (path, base) {
          return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
        }
    	}, fn(module, module.exports), module.exports;
    }

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
    }

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    function __rest(s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    }

    function __decorate(decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    }

    function __param(paramIndex, decorator) {
        return function (target, key) { decorator(target, key, paramIndex); }
    }

    function __metadata(metadataKey, metadataValue) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
    }

    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    function __generator(thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    }

    function __createBinding(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    }

    function __exportStar(m, exports) {
        for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) exports[p] = m[p];
    }

    function __values(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m) return m.call(o);
        if (o && typeof o.length === "number") return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    }

    function __read(o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    }

    function __spread() {
        for (var ar = [], i = 0; i < arguments.length; i++)
            ar = ar.concat(__read(arguments[i]));
        return ar;
    }

    function __spreadArrays() {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                r[k] = a[j];
        return r;
    }
    function __await(v) {
        return this instanceof __await ? (this.v = v, this) : new __await(v);
    }

    function __asyncGenerator(thisArg, _arguments, generator) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var g = generator.apply(thisArg, _arguments || []), i, q = [];
        return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
        function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
        function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
        function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
        function fulfill(value) { resume("next", value); }
        function reject(value) { resume("throw", value); }
        function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
    }

    function __asyncDelegator(o) {
        var i, p;
        return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
        function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; } : f; }
    }

    function __asyncValues(o) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var m = o[Symbol.asyncIterator], i;
        return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
        function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
        function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
    }

    function __makeTemplateObject(cooked, raw) {
        if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
        return cooked;
    }
    function __importStar(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
        result.default = mod;
        return result;
    }

    function __importDefault(mod) {
        return (mod && mod.__esModule) ? mod : { default: mod };
    }

    function __classPrivateFieldGet(receiver, privateMap) {
        if (!privateMap.has(receiver)) {
            throw new TypeError("attempted to get private field on non-instance");
        }
        return privateMap.get(receiver);
    }

    function __classPrivateFieldSet(receiver, privateMap, value) {
        if (!privateMap.has(receiver)) {
            throw new TypeError("attempted to set private field on non-instance");
        }
        privateMap.set(receiver, value);
        return value;
    }

    var tslib_es6 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        __extends: __extends,
        get __assign () { return __assign; },
        __rest: __rest,
        __decorate: __decorate,
        __param: __param,
        __metadata: __metadata,
        __awaiter: __awaiter,
        __generator: __generator,
        __createBinding: __createBinding,
        __exportStar: __exportStar,
        __values: __values,
        __read: __read,
        __spread: __spread,
        __spreadArrays: __spreadArrays,
        __await: __await,
        __asyncGenerator: __asyncGenerator,
        __asyncDelegator: __asyncDelegator,
        __asyncValues: __asyncValues,
        __makeTemplateObject: __makeTemplateObject,
        __importStar: __importStar,
        __importDefault: __importDefault,
        __classPrivateFieldGet: __classPrivateFieldGet,
        __classPrivateFieldSet: __classPrivateFieldSet
    });

    var index_cjs = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, '__esModule', { value: true });



    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * @fileoverview Firebase constants.  Some of these (@defines) can be overridden at compile-time.
     */
    var CONSTANTS = {
        /**
         * @define {boolean} Whether this is the client Node.js SDK.
         */
        NODE_CLIENT: false,
        /**
         * @define {boolean} Whether this is the Admin Node.js SDK.
         */
        NODE_ADMIN: false,
        /**
         * Firebase SDK Version
         */
        SDK_VERSION: '${JSCORE_VERSION}'
    };

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Throws an error if the provided assertion is falsy
     */
    var assert = function (assertion, message) {
        if (!assertion) {
            throw assertionError(message);
        }
    };
    /**
     * Returns an Error object suitable for throwing.
     */
    var assertionError = function (message) {
        return new Error('Firebase Database (' +
            CONSTANTS.SDK_VERSION +
            ') INTERNAL ASSERT FAILED: ' +
            message);
    };

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var stringToByteArray = function (str) {
        // TODO(user): Use native implementations if/when available
        var out = [];
        var p = 0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            if (c < 128) {
                out[p++] = c;
            }
            else if (c < 2048) {
                out[p++] = (c >> 6) | 192;
                out[p++] = (c & 63) | 128;
            }
            else if ((c & 0xfc00) === 0xd800 &&
                i + 1 < str.length &&
                (str.charCodeAt(i + 1) & 0xfc00) === 0xdc00) {
                // Surrogate Pair
                c = 0x10000 + ((c & 0x03ff) << 10) + (str.charCodeAt(++i) & 0x03ff);
                out[p++] = (c >> 18) | 240;
                out[p++] = ((c >> 12) & 63) | 128;
                out[p++] = ((c >> 6) & 63) | 128;
                out[p++] = (c & 63) | 128;
            }
            else {
                out[p++] = (c >> 12) | 224;
                out[p++] = ((c >> 6) & 63) | 128;
                out[p++] = (c & 63) | 128;
            }
        }
        return out;
    };
    /**
     * Turns an array of numbers into the string given by the concatenation of the
     * characters to which the numbers correspond.
     * @param bytes Array of numbers representing characters.
     * @return Stringification of the array.
     */
    var byteArrayToString = function (bytes) {
        // TODO(user): Use native implementations if/when available
        var out = [];
        var pos = 0, c = 0;
        while (pos < bytes.length) {
            var c1 = bytes[pos++];
            if (c1 < 128) {
                out[c++] = String.fromCharCode(c1);
            }
            else if (c1 > 191 && c1 < 224) {
                var c2 = bytes[pos++];
                out[c++] = String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
            }
            else if (c1 > 239 && c1 < 365) {
                // Surrogate Pair
                var c2 = bytes[pos++];
                var c3 = bytes[pos++];
                var c4 = bytes[pos++];
                var u = (((c1 & 7) << 18) | ((c2 & 63) << 12) | ((c3 & 63) << 6) | (c4 & 63)) -
                    0x10000;
                out[c++] = String.fromCharCode(0xd800 + (u >> 10));
                out[c++] = String.fromCharCode(0xdc00 + (u & 1023));
            }
            else {
                var c2 = bytes[pos++];
                var c3 = bytes[pos++];
                out[c++] = String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            }
        }
        return out.join('');
    };
    // We define it as an object literal instead of a class because a class compiled down to es5 can't
    // be treeshaked. https://github.com/rollup/rollup/issues/1691
    // Static lookup maps, lazily populated by init_()
    var base64 = {
        /**
         * Maps bytes to characters.
         */
        byteToCharMap_: null,
        /**
         * Maps characters to bytes.
         */
        charToByteMap_: null,
        /**
         * Maps bytes to websafe characters.
         * @private
         */
        byteToCharMapWebSafe_: null,
        /**
         * Maps websafe characters to bytes.
         * @private
         */
        charToByteMapWebSafe_: null,
        /**
         * Our default alphabet, shared between
         * ENCODED_VALS and ENCODED_VALS_WEBSAFE
         */
        ENCODED_VALS_BASE: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'abcdefghijklmnopqrstuvwxyz' + '0123456789',
        /**
         * Our default alphabet. Value 64 (=) is special; it means "nothing."
         */
        get ENCODED_VALS() {
            return this.ENCODED_VALS_BASE + '+/=';
        },
        /**
         * Our websafe alphabet.
         */
        get ENCODED_VALS_WEBSAFE() {
            return this.ENCODED_VALS_BASE + '-_.';
        },
        /**
         * Whether this browser supports the atob and btoa functions. This extension
         * started at Mozilla but is now implemented by many browsers. We use the
         * ASSUME_* variables to avoid pulling in the full useragent detection library
         * but still allowing the standard per-browser compilations.
         *
         */
        HAS_NATIVE_SUPPORT: typeof atob === 'function',
        /**
         * Base64-encode an array of bytes.
         *
         * @param input An array of bytes (numbers with
         *     value in [0, 255]) to encode.
         * @param webSafe Boolean indicating we should use the
         *     alternative alphabet.
         * @return The base64 encoded string.
         */
        encodeByteArray: function (input, webSafe) {
            if (!Array.isArray(input)) {
                throw Error('encodeByteArray takes an array as a parameter');
            }
            this.init_();
            var byteToCharMap = webSafe
                ? this.byteToCharMapWebSafe_
                : this.byteToCharMap_;
            var output = [];
            for (var i = 0; i < input.length; i += 3) {
                var byte1 = input[i];
                var haveByte2 = i + 1 < input.length;
                var byte2 = haveByte2 ? input[i + 1] : 0;
                var haveByte3 = i + 2 < input.length;
                var byte3 = haveByte3 ? input[i + 2] : 0;
                var outByte1 = byte1 >> 2;
                var outByte2 = ((byte1 & 0x03) << 4) | (byte2 >> 4);
                var outByte3 = ((byte2 & 0x0f) << 2) | (byte3 >> 6);
                var outByte4 = byte3 & 0x3f;
                if (!haveByte3) {
                    outByte4 = 64;
                    if (!haveByte2) {
                        outByte3 = 64;
                    }
                }
                output.push(byteToCharMap[outByte1], byteToCharMap[outByte2], byteToCharMap[outByte3], byteToCharMap[outByte4]);
            }
            return output.join('');
        },
        /**
         * Base64-encode a string.
         *
         * @param input A string to encode.
         * @param webSafe If true, we should use the
         *     alternative alphabet.
         * @return The base64 encoded string.
         */
        encodeString: function (input, webSafe) {
            // Shortcut for Mozilla browsers that implement
            // a native base64 encoder in the form of "btoa/atob"
            if (this.HAS_NATIVE_SUPPORT && !webSafe) {
                return btoa(input);
            }
            return this.encodeByteArray(stringToByteArray(input), webSafe);
        },
        /**
         * Base64-decode a string.
         *
         * @param input to decode.
         * @param webSafe True if we should use the
         *     alternative alphabet.
         * @return string representing the decoded value.
         */
        decodeString: function (input, webSafe) {
            // Shortcut for Mozilla browsers that implement
            // a native base64 encoder in the form of "btoa/atob"
            if (this.HAS_NATIVE_SUPPORT && !webSafe) {
                return atob(input);
            }
            return byteArrayToString(this.decodeStringToByteArray(input, webSafe));
        },
        /**
         * Base64-decode a string.
         *
         * In base-64 decoding, groups of four characters are converted into three
         * bytes.  If the encoder did not apply padding, the input length may not
         * be a multiple of 4.
         *
         * In this case, the last group will have fewer than 4 characters, and
         * padding will be inferred.  If the group has one or two characters, it decodes
         * to one byte.  If the group has three characters, it decodes to two bytes.
         *
         * @param input Input to decode.
         * @param webSafe True if we should use the web-safe alphabet.
         * @return bytes representing the decoded value.
         */
        decodeStringToByteArray: function (input, webSafe) {
            this.init_();
            var charToByteMap = webSafe
                ? this.charToByteMapWebSafe_
                : this.charToByteMap_;
            var output = [];
            for (var i = 0; i < input.length;) {
                var byte1 = charToByteMap[input.charAt(i++)];
                var haveByte2 = i < input.length;
                var byte2 = haveByte2 ? charToByteMap[input.charAt(i)] : 0;
                ++i;
                var haveByte3 = i < input.length;
                var byte3 = haveByte3 ? charToByteMap[input.charAt(i)] : 64;
                ++i;
                var haveByte4 = i < input.length;
                var byte4 = haveByte4 ? charToByteMap[input.charAt(i)] : 64;
                ++i;
                if (byte1 == null || byte2 == null || byte3 == null || byte4 == null) {
                    throw Error();
                }
                var outByte1 = (byte1 << 2) | (byte2 >> 4);
                output.push(outByte1);
                if (byte3 !== 64) {
                    var outByte2 = ((byte2 << 4) & 0xf0) | (byte3 >> 2);
                    output.push(outByte2);
                    if (byte4 !== 64) {
                        var outByte3 = ((byte3 << 6) & 0xc0) | byte4;
                        output.push(outByte3);
                    }
                }
            }
            return output;
        },
        /**
         * Lazy static initialization function. Called before
         * accessing any of the static map variables.
         * @private
         */
        init_: function () {
            if (!this.byteToCharMap_) {
                this.byteToCharMap_ = {};
                this.charToByteMap_ = {};
                this.byteToCharMapWebSafe_ = {};
                this.charToByteMapWebSafe_ = {};
                // We want quick mappings back and forth, so we precompute two maps.
                for (var i = 0; i < this.ENCODED_VALS.length; i++) {
                    this.byteToCharMap_[i] = this.ENCODED_VALS.charAt(i);
                    this.charToByteMap_[this.byteToCharMap_[i]] = i;
                    this.byteToCharMapWebSafe_[i] = this.ENCODED_VALS_WEBSAFE.charAt(i);
                    this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[i]] = i;
                    // Be forgiving when decoding and correctly decode both encodings.
                    if (i >= this.ENCODED_VALS_BASE.length) {
                        this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(i)] = i;
                        this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(i)] = i;
                    }
                }
            }
        }
    };
    /**
     * URL-safe base64 encoding
     */
    var base64Encode = function (str) {
        var utf8Bytes = stringToByteArray(str);
        return base64.encodeByteArray(utf8Bytes, true);
    };
    /**
     * URL-safe base64 decoding
     *
     * NOTE: DO NOT use the global atob() function - it does NOT support the
     * base64Url variant encoding.
     *
     * @param str To be decoded
     * @return Decoded result, if possible
     */
    var base64Decode = function (str) {
        try {
            return base64.decodeString(str, true);
        }
        catch (e) {
            console.error('base64Decode failed: ', e);
        }
        return null;
    };

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Do a deep-copy of basic JavaScript Objects or Arrays.
     */
    function deepCopy(value) {
        return deepExtend(undefined, value);
    }
    /**
     * Copy properties from source to target (recursively allows extension
     * of Objects and Arrays).  Scalar values in the target are over-written.
     * If target is undefined, an object of the appropriate type will be created
     * (and returned).
     *
     * We recursively copy all child properties of plain Objects in the source- so
     * that namespace- like dictionaries are merged.
     *
     * Note that the target can be a function, in which case the properties in
     * the source Object are copied onto it as static properties of the Function.
     */
    function deepExtend(target, source) {
        if (!(source instanceof Object)) {
            return source;
        }
        switch (source.constructor) {
            case Date:
                // Treat Dates like scalars; if the target date object had any child
                // properties - they will be lost!
                var dateValue = source;
                return new Date(dateValue.getTime());
            case Object:
                if (target === undefined) {
                    target = {};
                }
                break;
            case Array:
                // Always copy the array source and overwrite the target.
                target = [];
                break;
            default:
                // Not a plain Object - treat it as a scalar.
                return source;
        }
        for (var prop in source) {
            if (!source.hasOwnProperty(prop)) {
                continue;
            }
            target[prop] = deepExtend(target[prop], source[prop]);
        }
        return target;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var Deferred = /** @class */ (function () {
        function Deferred() {
            var _this = this;
            this.reject = function () { };
            this.resolve = function () { };
            this.promise = new Promise(function (resolve, reject) {
                _this.resolve = resolve;
                _this.reject = reject;
            });
        }
        /**
         * Our API internals are not promiseified and cannot because our callback APIs have subtle expectations around
         * invoking promises inline, which Promises are forbidden to do. This method accepts an optional node-style callback
         * and returns a node-style callback which will resolve or reject the Deferred's promise.
         */
        Deferred.prototype.wrapCallback = function (callback) {
            var _this = this;
            return function (error, value) {
                if (error) {
                    _this.reject(error);
                }
                else {
                    _this.resolve(value);
                }
                if (typeof callback === 'function') {
                    // Attaching noop handler just in case developer wasn't expecting
                    // promises
                    _this.promise.catch(function () { });
                    // Some of our callbacks don't expect a value and our own tests
                    // assert that the parameter length is 1
                    if (callback.length === 1) {
                        callback(error);
                    }
                    else {
                        callback(error, value);
                    }
                }
            };
        };
        return Deferred;
    }());

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Returns navigator.userAgent string or '' if it's not defined.
     * @return user agent string
     */
    function getUA() {
        if (typeof navigator !== 'undefined' &&
            typeof navigator['userAgent'] === 'string') {
            return navigator['userAgent'];
        }
        else {
            return '';
        }
    }
    /**
     * Detect Cordova / PhoneGap / Ionic frameworks on a mobile device.
     *
     * Deliberately does not rely on checking `file://` URLs (as this fails PhoneGap
     * in the Ripple emulator) nor Cordova `onDeviceReady`, which would normally
     * wait for a callback.
     */
    function isMobileCordova() {
        return (typeof window !== 'undefined' &&
            // @ts-ignore Setting up an broadly applicable index signature for Window
            // just to deal with this case would probably be a bad idea.
            !!(window['cordova'] || window['phonegap'] || window['PhoneGap']) &&
            /ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(getUA()));
    }
    /**
     * Detect Node.js.
     *
     * @return true if Node.js environment is detected.
     */
    // Node detection logic from: https://github.com/iliakan/detect-node/
    function isNode() {
        try {
            return (Object.prototype.toString.call(commonjsGlobal.process) === '[object process]');
        }
        catch (e) {
            return false;
        }
    }
    /**
     * Detect Browser Environment
     */
    function isBrowser() {
        return typeof self === 'object' && self.self === self;
    }
    function isBrowserExtension() {
        var runtime = typeof chrome === 'object'
            ? chrome.runtime
            : typeof browser === 'object'
                ? browser.runtime
                : undefined;
        return typeof runtime === 'object' && runtime.id !== undefined;
    }
    /**
     * Detect React Native.
     *
     * @return true if ReactNative environment is detected.
     */
    function isReactNative() {
        return (typeof navigator === 'object' && navigator['product'] === 'ReactNative');
    }
    /** Detects Electron apps. */
    function isElectron() {
        return getUA().indexOf('Electron/') >= 0;
    }
    /** Detects Internet Explorer. */
    function isIE() {
        var ua = getUA();
        return ua.indexOf('MSIE ') >= 0 || ua.indexOf('Trident/') >= 0;
    }
    /** Detects Universal Windows Platform apps. */
    function isUWP() {
        return getUA().indexOf('MSAppHost/') >= 0;
    }
    /**
     * Detect whether the current SDK build is the Node version.
     *
     * @return true if it's the Node SDK build.
     */
    function isNodeSdk() {
        return CONSTANTS.NODE_CLIENT === true || CONSTANTS.NODE_ADMIN === true;
    }
    /** Returns true if we are running in Safari. */
    function isSafari() {
        return (!isNode() &&
            navigator.userAgent.includes('Safari') &&
            !navigator.userAgent.includes('Chrome'));
    }
    /**
     * This method checks if indexedDB is supported by current browser/service worker context
     * @return true if indexedDB is supported by current browser/service worker context
     */
    function isIndexedDBAvailable() {
        return 'indexedDB' in self && indexedDB !== null;
    }
    /**
     * This method validates browser context for indexedDB by opening a dummy indexedDB database and reject
     * if errors occur during the database open operation.
     */
    function validateIndexedDBOpenable() {
        return new Promise(function (resolve, reject) {
            try {
                var preExist_1 = true;
                var DB_CHECK_NAME_1 = 'validate-browser-context-for-indexeddb-analytics-module';
                var request_1 = window.indexedDB.open(DB_CHECK_NAME_1);
                request_1.onsuccess = function () {
                    request_1.result.close();
                    // delete database only when it doesn't pre-exist
                    if (!preExist_1) {
                        window.indexedDB.deleteDatabase(DB_CHECK_NAME_1);
                    }
                    resolve(true);
                };
                request_1.onupgradeneeded = function () {
                    preExist_1 = false;
                };
                request_1.onerror = function () {
                    var _a;
                    reject(((_a = request_1.error) === null || _a === void 0 ? void 0 : _a.message) || '');
                };
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     *
     * This method checks whether cookie is enabled within current browser
     * @return true if cookie is enabled within current browser
     */
    function areCookiesEnabled() {
        if (!navigator || !navigator.cookieEnabled) {
            return false;
        }
        return true;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var ERROR_NAME = 'FirebaseError';
    // Based on code from:
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#Custom_Error_Types
    var FirebaseError = /** @class */ (function (_super) {
        tslib_es6.__extends(FirebaseError, _super);
        function FirebaseError(code, message) {
            var _this = _super.call(this, message) || this;
            _this.code = code;
            _this.name = ERROR_NAME;
            // Fix For ES5
            // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
            Object.setPrototypeOf(_this, FirebaseError.prototype);
            // Maintains proper stack trace for where our error was thrown.
            // Only available on V8.
            if (Error.captureStackTrace) {
                Error.captureStackTrace(_this, ErrorFactory.prototype.create);
            }
            return _this;
        }
        return FirebaseError;
    }(Error));
    var ErrorFactory = /** @class */ (function () {
        function ErrorFactory(service, serviceName, errors) {
            this.service = service;
            this.serviceName = serviceName;
            this.errors = errors;
        }
        ErrorFactory.prototype.create = function (code) {
            var data = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                data[_i - 1] = arguments[_i];
            }
            var customData = data[0] || {};
            var fullCode = this.service + "/" + code;
            var template = this.errors[code];
            var message = template ? replaceTemplate(template, customData) : 'Error';
            // Service Name: Error message (service/code).
            var fullMessage = this.serviceName + ": " + message + " (" + fullCode + ").";
            var error = new FirebaseError(fullCode, fullMessage);
            // Keys with an underscore at the end of their name are not included in
            // error.data for some reason.
            // TODO: Replace with Object.entries when lib is updated to es2017.
            for (var _a = 0, _b = Object.keys(customData); _a < _b.length; _a++) {
                var key = _b[_a];
                if (key.slice(-1) !== '_') {
                    if (key in error) {
                        console.warn("Overwriting FirebaseError base field \"" + key + "\" can cause unexpected behavior.");
                    }
                    error[key] = customData[key];
                }
            }
            return error;
        };
        return ErrorFactory;
    }());
    function replaceTemplate(template, data) {
        return template.replace(PATTERN, function (_, key) {
            var value = data[key];
            return value != null ? String(value) : "<" + key + "?>";
        });
    }
    var PATTERN = /\{\$([^}]+)}/g;

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Evaluates a JSON string into a javascript object.
     *
     * @param {string} str A string containing JSON.
     * @return {*} The javascript object representing the specified JSON.
     */
    function jsonEval(str) {
        return JSON.parse(str);
    }
    /**
     * Returns JSON representing a javascript object.
     * @param {*} data Javascript object to be stringified.
     * @return {string} The JSON contents of the object.
     */
    function stringify(data) {
        return JSON.stringify(data);
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Decodes a Firebase auth. token into constituent parts.
     *
     * Notes:
     * - May return with invalid / incomplete claims if there's no native base64 decoding support.
     * - Doesn't check if the token is actually valid.
     */
    var decode = function (token) {
        var header = {}, claims = {}, data = {}, signature = '';
        try {
            var parts = token.split('.');
            header = jsonEval(base64Decode(parts[0]) || '');
            claims = jsonEval(base64Decode(parts[1]) || '');
            signature = parts[2];
            data = claims['d'] || {};
            delete claims['d'];
        }
        catch (e) { }
        return {
            header: header,
            claims: claims,
            data: data,
            signature: signature
        };
    };
    /**
     * Decodes a Firebase auth. token and checks the validity of its time-based claims. Will return true if the
     * token is within the time window authorized by the 'nbf' (not-before) and 'iat' (issued-at) claims.
     *
     * Notes:
     * - May return a false negative if there's no native base64 decoding support.
     * - Doesn't check if the token is actually valid.
     */
    var isValidTimestamp = function (token) {
        var claims = decode(token).claims;
        var now = Math.floor(new Date().getTime() / 1000);
        var validSince = 0, validUntil = 0;
        if (typeof claims === 'object') {
            if (claims.hasOwnProperty('nbf')) {
                validSince = claims['nbf'];
            }
            else if (claims.hasOwnProperty('iat')) {
                validSince = claims['iat'];
            }
            if (claims.hasOwnProperty('exp')) {
                validUntil = claims['exp'];
            }
            else {
                // token will expire after 24h by default
                validUntil = validSince + 86400;
            }
        }
        return (!!now &&
            !!validSince &&
            !!validUntil &&
            now >= validSince &&
            now <= validUntil);
    };
    /**
     * Decodes a Firebase auth. token and returns its issued at time if valid, null otherwise.
     *
     * Notes:
     * - May return null if there's no native base64 decoding support.
     * - Doesn't check if the token is actually valid.
     */
    var issuedAtTime = function (token) {
        var claims = decode(token).claims;
        if (typeof claims === 'object' && claims.hasOwnProperty('iat')) {
            return claims['iat'];
        }
        return null;
    };
    /**
     * Decodes a Firebase auth. token and checks the validity of its format. Expects a valid issued-at time.
     *
     * Notes:
     * - May return a false negative if there's no native base64 decoding support.
     * - Doesn't check if the token is actually valid.
     */
    var isValidFormat = function (token) {
        var decoded = decode(token), claims = decoded.claims;
        return !!claims && typeof claims === 'object' && claims.hasOwnProperty('iat');
    };
    /**
     * Attempts to peer into an auth token and determine if it's an admin auth token by looking at the claims portion.
     *
     * Notes:
     * - May return a false negative if there's no native base64 decoding support.
     * - Doesn't check if the token is actually valid.
     */
    var isAdmin = function (token) {
        var claims = decode(token).claims;
        return typeof claims === 'object' && claims['admin'] === true;
    };

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function contains(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    }
    function safeGet(obj, key) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            return obj[key];
        }
        else {
            return undefined;
        }
    }
    function isEmpty(obj) {
        for (var key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                return false;
            }
        }
        return true;
    }
    function map(obj, fn, contextObj) {
        var res = {};
        for (var key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                res[key] = fn.call(contextObj, obj[key], key, obj);
            }
        }
        return res;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Returns a querystring-formatted string (e.g. &arg=val&arg2=val2) from a
     * params object (e.g. {arg: 'val', arg2: 'val2'})
     * Note: You must prepend it with ? when adding it to a URL.
     */
    function querystring(querystringParams) {
        var params = [];
        var _loop_1 = function (key, value) {
            if (Array.isArray(value)) {
                value.forEach(function (arrayVal) {
                    params.push(encodeURIComponent(key) + '=' + encodeURIComponent(arrayVal));
                });
            }
            else {
                params.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
            }
        };
        for (var _i = 0, _a = Object.entries(querystringParams); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            _loop_1(key, value);
        }
        return params.length ? '&' + params.join('&') : '';
    }
    /**
     * Decodes a querystring (e.g. ?arg=val&arg2=val2) into a params object
     * (e.g. {arg: 'val', arg2: 'val2'})
     */
    function querystringDecode(querystring) {
        var obj = {};
        var tokens = querystring.replace(/^\?/, '').split('&');
        tokens.forEach(function (token) {
            if (token) {
                var key = token.split('=');
                obj[key[0]] = key[1];
            }
        });
        return obj;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * @fileoverview SHA-1 cryptographic hash.
     * Variable names follow the notation in FIPS PUB 180-3:
     * http://csrc.nist.gov/publications/fips/fips180-3/fips180-3_final.pdf.
     *
     * Usage:
     *   var sha1 = new sha1();
     *   sha1.update(bytes);
     *   var hash = sha1.digest();
     *
     * Performance:
     *   Chrome 23:   ~400 Mbit/s
     *   Firefox 16:  ~250 Mbit/s
     *
     */
    /**
     * SHA-1 cryptographic hash constructor.
     *
     * The properties declared here are discussed in the above algorithm document.
     * @constructor
     * @final
     * @struct
     */
    var Sha1 = /** @class */ (function () {
        function Sha1() {
            /**
             * Holds the previous values of accumulated variables a-e in the compress_
             * function.
             * @private
             */
            this.chain_ = [];
            /**
             * A buffer holding the partially computed hash result.
             * @private
             */
            this.buf_ = [];
            /**
             * An array of 80 bytes, each a part of the message to be hashed.  Referred to
             * as the message schedule in the docs.
             * @private
             */
            this.W_ = [];
            /**
             * Contains data needed to pad messages less than 64 bytes.
             * @private
             */
            this.pad_ = [];
            /**
             * @private {number}
             */
            this.inbuf_ = 0;
            /**
             * @private {number}
             */
            this.total_ = 0;
            this.blockSize = 512 / 8;
            this.pad_[0] = 128;
            for (var i = 1; i < this.blockSize; ++i) {
                this.pad_[i] = 0;
            }
            this.reset();
        }
        Sha1.prototype.reset = function () {
            this.chain_[0] = 0x67452301;
            this.chain_[1] = 0xefcdab89;
            this.chain_[2] = 0x98badcfe;
            this.chain_[3] = 0x10325476;
            this.chain_[4] = 0xc3d2e1f0;
            this.inbuf_ = 0;
            this.total_ = 0;
        };
        /**
         * Internal compress helper function.
         * @param buf Block to compress.
         * @param offset Offset of the block in the buffer.
         * @private
         */
        Sha1.prototype.compress_ = function (buf, offset) {
            if (!offset) {
                offset = 0;
            }
            var W = this.W_;
            // get 16 big endian words
            if (typeof buf === 'string') {
                for (var i = 0; i < 16; i++) {
                    // TODO(user): [bug 8140122] Recent versions of Safari for Mac OS and iOS
                    // have a bug that turns the post-increment ++ operator into pre-increment
                    // during JIT compilation.  We have code that depends heavily on SHA-1 for
                    // correctness and which is affected by this bug, so I've removed all uses
                    // of post-increment ++ in which the result value is used.  We can revert
                    // this change once the Safari bug
                    // (https://bugs.webkit.org/show_bug.cgi?id=109036) has been fixed and
                    // most clients have been updated.
                    W[i] =
                        (buf.charCodeAt(offset) << 24) |
                            (buf.charCodeAt(offset + 1) << 16) |
                            (buf.charCodeAt(offset + 2) << 8) |
                            buf.charCodeAt(offset + 3);
                    offset += 4;
                }
            }
            else {
                for (var i = 0; i < 16; i++) {
                    W[i] =
                        (buf[offset] << 24) |
                            (buf[offset + 1] << 16) |
                            (buf[offset + 2] << 8) |
                            buf[offset + 3];
                    offset += 4;
                }
            }
            // expand to 80 words
            for (var i = 16; i < 80; i++) {
                var t = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16];
                W[i] = ((t << 1) | (t >>> 31)) & 0xffffffff;
            }
            var a = this.chain_[0];
            var b = this.chain_[1];
            var c = this.chain_[2];
            var d = this.chain_[3];
            var e = this.chain_[4];
            var f, k;
            // TODO(user): Try to unroll this loop to speed up the computation.
            for (var i = 0; i < 80; i++) {
                if (i < 40) {
                    if (i < 20) {
                        f = d ^ (b & (c ^ d));
                        k = 0x5a827999;
                    }
                    else {
                        f = b ^ c ^ d;
                        k = 0x6ed9eba1;
                    }
                }
                else {
                    if (i < 60) {
                        f = (b & c) | (d & (b | c));
                        k = 0x8f1bbcdc;
                    }
                    else {
                        f = b ^ c ^ d;
                        k = 0xca62c1d6;
                    }
                }
                var t = (((a << 5) | (a >>> 27)) + f + e + k + W[i]) & 0xffffffff;
                e = d;
                d = c;
                c = ((b << 30) | (b >>> 2)) & 0xffffffff;
                b = a;
                a = t;
            }
            this.chain_[0] = (this.chain_[0] + a) & 0xffffffff;
            this.chain_[1] = (this.chain_[1] + b) & 0xffffffff;
            this.chain_[2] = (this.chain_[2] + c) & 0xffffffff;
            this.chain_[3] = (this.chain_[3] + d) & 0xffffffff;
            this.chain_[4] = (this.chain_[4] + e) & 0xffffffff;
        };
        Sha1.prototype.update = function (bytes, length) {
            // TODO(johnlenz): tighten the function signature and remove this check
            if (bytes == null) {
                return;
            }
            if (length === undefined) {
                length = bytes.length;
            }
            var lengthMinusBlock = length - this.blockSize;
            var n = 0;
            // Using local instead of member variables gives ~5% speedup on Firefox 16.
            var buf = this.buf_;
            var inbuf = this.inbuf_;
            // The outer while loop should execute at most twice.
            while (n < length) {
                // When we have no data in the block to top up, we can directly process the
                // input buffer (assuming it contains sufficient data). This gives ~25%
                // speedup on Chrome 23 and ~15% speedup on Firefox 16, but requires that
                // the data is provided in large chunks (or in multiples of 64 bytes).
                if (inbuf === 0) {
                    while (n <= lengthMinusBlock) {
                        this.compress_(bytes, n);
                        n += this.blockSize;
                    }
                }
                if (typeof bytes === 'string') {
                    while (n < length) {
                        buf[inbuf] = bytes.charCodeAt(n);
                        ++inbuf;
                        ++n;
                        if (inbuf === this.blockSize) {
                            this.compress_(buf);
                            inbuf = 0;
                            // Jump to the outer loop so we use the full-block optimization.
                            break;
                        }
                    }
                }
                else {
                    while (n < length) {
                        buf[inbuf] = bytes[n];
                        ++inbuf;
                        ++n;
                        if (inbuf === this.blockSize) {
                            this.compress_(buf);
                            inbuf = 0;
                            // Jump to the outer loop so we use the full-block optimization.
                            break;
                        }
                    }
                }
            }
            this.inbuf_ = inbuf;
            this.total_ += length;
        };
        /** @override */
        Sha1.prototype.digest = function () {
            var digest = [];
            var totalBits = this.total_ * 8;
            // Add pad 0x80 0x00*.
            if (this.inbuf_ < 56) {
                this.update(this.pad_, 56 - this.inbuf_);
            }
            else {
                this.update(this.pad_, this.blockSize - (this.inbuf_ - 56));
            }
            // Add # bits.
            for (var i = this.blockSize - 1; i >= 56; i--) {
                this.buf_[i] = totalBits & 255;
                totalBits /= 256; // Don't use bit-shifting here!
            }
            this.compress_(this.buf_);
            var n = 0;
            for (var i = 0; i < 5; i++) {
                for (var j = 24; j >= 0; j -= 8) {
                    digest[n] = (this.chain_[i] >> j) & 255;
                    ++n;
                }
            }
            return digest;
        };
        return Sha1;
    }());

    /**
     * Helper to make a Subscribe function (just like Promise helps make a
     * Thenable).
     *
     * @param executor Function which can make calls to a single Observer
     *     as a proxy.
     * @param onNoObservers Callback when count of Observers goes to zero.
     */
    function createSubscribe(executor, onNoObservers) {
        var proxy = new ObserverProxy(executor, onNoObservers);
        return proxy.subscribe.bind(proxy);
    }
    /**
     * Implement fan-out for any number of Observers attached via a subscribe
     * function.
     */
    var ObserverProxy = /** @class */ (function () {
        /**
         * @param executor Function which can make calls to a single Observer
         *     as a proxy.
         * @param onNoObservers Callback when count of Observers goes to zero.
         */
        function ObserverProxy(executor, onNoObservers) {
            var _this = this;
            this.observers = [];
            this.unsubscribes = [];
            this.observerCount = 0;
            // Micro-task scheduling by calling task.then().
            this.task = Promise.resolve();
            this.finalized = false;
            this.onNoObservers = onNoObservers;
            // Call the executor asynchronously so subscribers that are called
            // synchronously after the creation of the subscribe function
            // can still receive the very first value generated in the executor.
            this.task
                .then(function () {
                executor(_this);
            })
                .catch(function (e) {
                _this.error(e);
            });
        }
        ObserverProxy.prototype.next = function (value) {
            this.forEachObserver(function (observer) {
                observer.next(value);
            });
        };
        ObserverProxy.prototype.error = function (error) {
            this.forEachObserver(function (observer) {
                observer.error(error);
            });
            this.close(error);
        };
        ObserverProxy.prototype.complete = function () {
            this.forEachObserver(function (observer) {
                observer.complete();
            });
            this.close();
        };
        /**
         * Subscribe function that can be used to add an Observer to the fan-out list.
         *
         * - We require that no event is sent to a subscriber sychronously to their
         *   call to subscribe().
         */
        ObserverProxy.prototype.subscribe = function (nextOrObserver, error, complete) {
            var _this = this;
            var observer;
            if (nextOrObserver === undefined &&
                error === undefined &&
                complete === undefined) {
                throw new Error('Missing Observer.');
            }
            // Assemble an Observer object when passed as callback functions.
            if (implementsAnyMethods(nextOrObserver, [
                'next',
                'error',
                'complete'
            ])) {
                observer = nextOrObserver;
            }
            else {
                observer = {
                    next: nextOrObserver,
                    error: error,
                    complete: complete
                };
            }
            if (observer.next === undefined) {
                observer.next = noop;
            }
            if (observer.error === undefined) {
                observer.error = noop;
            }
            if (observer.complete === undefined) {
                observer.complete = noop;
            }
            var unsub = this.unsubscribeOne.bind(this, this.observers.length);
            // Attempt to subscribe to a terminated Observable - we
            // just respond to the Observer with the final error or complete
            // event.
            if (this.finalized) {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                this.task.then(function () {
                    try {
                        if (_this.finalError) {
                            observer.error(_this.finalError);
                        }
                        else {
                            observer.complete();
                        }
                    }
                    catch (e) {
                        // nothing
                    }
                    return;
                });
            }
            this.observers.push(observer);
            return unsub;
        };
        // Unsubscribe is synchronous - we guarantee that no events are sent to
        // any unsubscribed Observer.
        ObserverProxy.prototype.unsubscribeOne = function (i) {
            if (this.observers === undefined || this.observers[i] === undefined) {
                return;
            }
            delete this.observers[i];
            this.observerCount -= 1;
            if (this.observerCount === 0 && this.onNoObservers !== undefined) {
                this.onNoObservers(this);
            }
        };
        ObserverProxy.prototype.forEachObserver = function (fn) {
            if (this.finalized) {
                // Already closed by previous event....just eat the additional values.
                return;
            }
            // Since sendOne calls asynchronously - there is no chance that
            // this.observers will become undefined.
            for (var i = 0; i < this.observers.length; i++) {
                this.sendOne(i, fn);
            }
        };
        // Call the Observer via one of it's callback function. We are careful to
        // confirm that the observe has not been unsubscribed since this asynchronous
        // function had been queued.
        ObserverProxy.prototype.sendOne = function (i, fn) {
            var _this = this;
            // Execute the callback asynchronously
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.task.then(function () {
                if (_this.observers !== undefined && _this.observers[i] !== undefined) {
                    try {
                        fn(_this.observers[i]);
                    }
                    catch (e) {
                        // Ignore exceptions raised in Observers or missing methods of an
                        // Observer.
                        // Log error to console. b/31404806
                        if (typeof console !== 'undefined' && console.error) {
                            console.error(e);
                        }
                    }
                }
            });
        };
        ObserverProxy.prototype.close = function (err) {
            var _this = this;
            if (this.finalized) {
                return;
            }
            this.finalized = true;
            if (err !== undefined) {
                this.finalError = err;
            }
            // Proxy is no longer needed - garbage collect references
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.task.then(function () {
                _this.observers = undefined;
                _this.onNoObservers = undefined;
            });
        };
        return ObserverProxy;
    }());
    /** Turn synchronous function into one called asynchronously. */
    function async(fn, onError) {
        return function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            Promise.resolve(true)
                .then(function () {
                fn.apply(void 0, args);
            })
                .catch(function (error) {
                if (onError) {
                    onError(error);
                }
            });
        };
    }
    /**
     * Return true if the object passed in implements any of the named methods.
     */
    function implementsAnyMethods(obj, methods) {
        if (typeof obj !== 'object' || obj === null) {
            return false;
        }
        for (var _i = 0, methods_1 = methods; _i < methods_1.length; _i++) {
            var method = methods_1[_i];
            if (method in obj && typeof obj[method] === 'function') {
                return true;
            }
        }
        return false;
    }
    function noop() {
        // do nothing
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Check to make sure the appropriate number of arguments are provided for a public function.
     * Throws an error if it fails.
     *
     * @param fnName The function name
     * @param minCount The minimum number of arguments to allow for the function call
     * @param maxCount The maximum number of argument to allow for the function call
     * @param argCount The actual number of arguments provided.
     */
    var validateArgCount = function (fnName, minCount, maxCount, argCount) {
        var argError;
        if (argCount < minCount) {
            argError = 'at least ' + minCount;
        }
        else if (argCount > maxCount) {
            argError = maxCount === 0 ? 'none' : 'no more than ' + maxCount;
        }
        if (argError) {
            var error = fnName +
                ' failed: Was called with ' +
                argCount +
                (argCount === 1 ? ' argument.' : ' arguments.') +
                ' Expects ' +
                argError +
                '.';
            throw new Error(error);
        }
    };
    /**
     * Generates a string to prefix an error message about failed argument validation
     *
     * @param fnName The function name
     * @param argumentNumber The index of the argument
     * @param optional Whether or not the argument is optional
     * @return The prefix to add to the error thrown for validation.
     */
    function errorPrefix(fnName, argumentNumber, optional) {
        var argName = '';
        switch (argumentNumber) {
            case 1:
                argName = optional ? 'first' : 'First';
                break;
            case 2:
                argName = optional ? 'second' : 'Second';
                break;
            case 3:
                argName = optional ? 'third' : 'Third';
                break;
            case 4:
                argName = optional ? 'fourth' : 'Fourth';
                break;
            default:
                throw new Error('errorPrefix called with argumentNumber > 4.  Need to update it?');
        }
        var error = fnName + ' failed: ';
        error += argName + ' argument ';
        return error;
    }
    /**
     * @param fnName
     * @param argumentNumber
     * @param namespace
     * @param optional
     */
    function validateNamespace(fnName, argumentNumber, namespace, optional) {
        if (optional && !namespace) {
            return;
        }
        if (typeof namespace !== 'string') {
            //TODO: I should do more validation here. We only allow certain chars in namespaces.
            throw new Error(errorPrefix(fnName, argumentNumber, optional) +
                'must be a valid firebase namespace.');
        }
    }
    function validateCallback(fnName, argumentNumber, callback, optional) {
        if (optional && !callback) {
            return;
        }
        if (typeof callback !== 'function') {
            throw new Error(errorPrefix(fnName, argumentNumber, optional) +
                'must be a valid function.');
        }
    }
    function validateContextObject(fnName, argumentNumber, context, optional) {
        if (optional && !context) {
            return;
        }
        if (typeof context !== 'object' || context === null) {
            throw new Error(errorPrefix(fnName, argumentNumber, optional) +
                'must be a valid context object.');
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // Code originally came from goog.crypt.stringToUtf8ByteArray, but for some reason they
    // automatically replaced '\r\n' with '\n', and they didn't handle surrogate pairs,
    // so it's been modified.
    // Note that not all Unicode characters appear as single characters in JavaScript strings.
    // fromCharCode returns the UTF-16 encoding of a character - so some Unicode characters
    // use 2 characters in Javascript.  All 4-byte UTF-8 characters begin with a first
    // character in the range 0xD800 - 0xDBFF (the first character of a so-called surrogate
    // pair).
    // See http://www.ecma-international.org/ecma-262/5.1/#sec-15.1.3
    /**
     * @param {string} str
     * @return {Array}
     */
    var stringToByteArray$1 = function (str) {
        var out = [];
        var p = 0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            // Is this the lead surrogate in a surrogate pair?
            if (c >= 0xd800 && c <= 0xdbff) {
                var high = c - 0xd800; // the high 10 bits.
                i++;
                assert(i < str.length, 'Surrogate pair missing trail surrogate.');
                var low = str.charCodeAt(i) - 0xdc00; // the low 10 bits.
                c = 0x10000 + (high << 10) + low;
            }
            if (c < 128) {
                out[p++] = c;
            }
            else if (c < 2048) {
                out[p++] = (c >> 6) | 192;
                out[p++] = (c & 63) | 128;
            }
            else if (c < 65536) {
                out[p++] = (c >> 12) | 224;
                out[p++] = ((c >> 6) & 63) | 128;
                out[p++] = (c & 63) | 128;
            }
            else {
                out[p++] = (c >> 18) | 240;
                out[p++] = ((c >> 12) & 63) | 128;
                out[p++] = ((c >> 6) & 63) | 128;
                out[p++] = (c & 63) | 128;
            }
        }
        return out;
    };
    /**
     * Calculate length without actually converting; useful for doing cheaper validation.
     * @param {string} str
     * @return {number}
     */
    var stringLength = function (str) {
        var p = 0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            if (c < 128) {
                p++;
            }
            else if (c < 2048) {
                p += 2;
            }
            else if (c >= 0xd800 && c <= 0xdbff) {
                // Lead surrogate of a surrogate pair.  The pair together will take 4 bytes to represent.
                p += 4;
                i++; // skip trail surrogate.
            }
            else {
                p += 3;
            }
        }
        return p;
    };

    exports.CONSTANTS = CONSTANTS;
    exports.Deferred = Deferred;
    exports.ErrorFactory = ErrorFactory;
    exports.FirebaseError = FirebaseError;
    exports.Sha1 = Sha1;
    exports.areCookiesEnabled = areCookiesEnabled;
    exports.assert = assert;
    exports.assertionError = assertionError;
    exports.async = async;
    exports.base64 = base64;
    exports.base64Decode = base64Decode;
    exports.base64Encode = base64Encode;
    exports.contains = contains;
    exports.createSubscribe = createSubscribe;
    exports.decode = decode;
    exports.deepCopy = deepCopy;
    exports.deepExtend = deepExtend;
    exports.errorPrefix = errorPrefix;
    exports.getUA = getUA;
    exports.isAdmin = isAdmin;
    exports.isBrowser = isBrowser;
    exports.isBrowserExtension = isBrowserExtension;
    exports.isElectron = isElectron;
    exports.isEmpty = isEmpty;
    exports.isIE = isIE;
    exports.isIndexedDBAvailable = isIndexedDBAvailable;
    exports.isMobileCordova = isMobileCordova;
    exports.isNode = isNode;
    exports.isNodeSdk = isNodeSdk;
    exports.isReactNative = isReactNative;
    exports.isSafari = isSafari;
    exports.isUWP = isUWP;
    exports.isValidFormat = isValidFormat;
    exports.isValidTimestamp = isValidTimestamp;
    exports.issuedAtTime = issuedAtTime;
    exports.jsonEval = jsonEval;
    exports.map = map;
    exports.querystring = querystring;
    exports.querystringDecode = querystringDecode;
    exports.safeGet = safeGet;
    exports.stringLength = stringLength;
    exports.stringToByteArray = stringToByteArray$1;
    exports.stringify = stringify;
    exports.validateArgCount = validateArgCount;
    exports.validateCallback = validateCallback;
    exports.validateContextObject = validateContextObject;
    exports.validateIndexedDBOpenable = validateIndexedDBOpenable;
    exports.validateNamespace = validateNamespace;

    });

    var index_cjs$1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, '__esModule', { value: true });




    /**
     * Component for service name T, e.g. `auth`, `auth-internal`
     */
    var Component = /** @class */ (function () {
        /**
         *
         * @param name The public service name, e.g. app, auth, firestore, database
         * @param instanceFactory Service factory responsible for creating the public interface
         * @param type whether the service provided by the component is public or private
         */
        function Component(name, instanceFactory, type) {
            this.name = name;
            this.instanceFactory = instanceFactory;
            this.type = type;
            this.multipleInstances = false;
            /**
             * Properties to be added to the service namespace
             */
            this.serviceProps = {};
            this.instantiationMode = "LAZY" /* LAZY */;
        }
        Component.prototype.setInstantiationMode = function (mode) {
            this.instantiationMode = mode;
            return this;
        };
        Component.prototype.setMultipleInstances = function (multipleInstances) {
            this.multipleInstances = multipleInstances;
            return this;
        };
        Component.prototype.setServiceProps = function (props) {
            this.serviceProps = props;
            return this;
        };
        return Component;
    }());

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var DEFAULT_ENTRY_NAME = '[DEFAULT]';

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Provider for instance for service name T, e.g. 'auth', 'auth-internal'
     * NameServiceMapping[T] is an alias for the type of the instance
     */
    var Provider = /** @class */ (function () {
        function Provider(name, container) {
            this.name = name;
            this.container = container;
            this.component = null;
            this.instances = new Map();
            this.instancesDeferred = new Map();
        }
        /**
         * @param identifier A provider can provide mulitple instances of a service
         * if this.component.multipleInstances is true.
         */
        Provider.prototype.get = function (identifier) {
            if (identifier === void 0) { identifier = DEFAULT_ENTRY_NAME; }
            // if multipleInstances is not supported, use the default name
            var normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
            if (!this.instancesDeferred.has(normalizedIdentifier)) {
                var deferred = new index_cjs.Deferred();
                this.instancesDeferred.set(normalizedIdentifier, deferred);
                // If the service instance is available, resolve the promise with it immediately
                try {
                    var instance = this.getOrInitializeService(normalizedIdentifier);
                    if (instance) {
                        deferred.resolve(instance);
                    }
                }
                catch (e) {
                    // when the instance factory throws an exception during get(), it should not cause
                    // a fatal error. We just return the unresolved promise in this case.
                }
            }
            return this.instancesDeferred.get(normalizedIdentifier).promise;
        };
        Provider.prototype.getImmediate = function (options) {
            var _a = tslib_es6.__assign({ identifier: DEFAULT_ENTRY_NAME, optional: false }, options), identifier = _a.identifier, optional = _a.optional;
            // if multipleInstances is not supported, use the default name
            var normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
            try {
                var instance = this.getOrInitializeService(normalizedIdentifier);
                if (!instance) {
                    if (optional) {
                        return null;
                    }
                    throw Error("Service " + this.name + " is not available");
                }
                return instance;
            }
            catch (e) {
                if (optional) {
                    return null;
                }
                else {
                    throw e;
                }
            }
        };
        Provider.prototype.getComponent = function () {
            return this.component;
        };
        Provider.prototype.setComponent = function (component) {
            var e_1, _a;
            if (component.name !== this.name) {
                throw Error("Mismatching Component " + component.name + " for Provider " + this.name + ".");
            }
            if (this.component) {
                throw Error("Component for " + this.name + " has already been provided");
            }
            this.component = component;
            // if the service is eager, initialize the default instance
            if (isComponentEager(component)) {
                try {
                    this.getOrInitializeService(DEFAULT_ENTRY_NAME);
                }
                catch (e) {
                    // when the instance factory for an eager Component throws an exception during the eager
                    // initialization, it should not cause a fatal error.
                    // TODO: Investigate if we need to make it configurable, because some component may want to cause
                    // a fatal error in this case?
                }
            }
            try {
                // Create service instances for the pending promises and resolve them
                // NOTE: if this.multipleInstances is false, only the default instance will be created
                // and all promises with resolve with it regardless of the identifier.
                for (var _b = tslib_es6.__values(this.instancesDeferred.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = tslib_es6.__read(_c.value, 2), instanceIdentifier = _d[0], instanceDeferred = _d[1];
                    var normalizedIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
                    try {
                        // `getOrInitializeService()` should always return a valid instance since a component is guaranteed. use ! to make typescript happy.
                        var instance = this.getOrInitializeService(normalizedIdentifier);
                        instanceDeferred.resolve(instance);
                    }
                    catch (e) {
                        // when the instance factory throws an exception, it should not cause
                        // a fatal error. We just leave the promise unresolved.
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        };
        Provider.prototype.clearInstance = function (identifier) {
            if (identifier === void 0) { identifier = DEFAULT_ENTRY_NAME; }
            this.instancesDeferred.delete(identifier);
            this.instances.delete(identifier);
        };
        // app.delete() will call this method on every provider to delete the services
        // TODO: should we mark the provider as deleted?
        Provider.prototype.delete = function () {
            return tslib_es6.__awaiter(this, void 0, void 0, function () {
                var services;
                return tslib_es6.__generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            services = Array.from(this.instances.values());
                            return [4 /*yield*/, Promise.all(services
                                    .filter(function (service) { return 'INTERNAL' in service; })
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    .map(function (service) { return service.INTERNAL.delete(); }))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        Provider.prototype.isComponentSet = function () {
            return this.component != null;
        };
        Provider.prototype.getOrInitializeService = function (identifier) {
            var instance = this.instances.get(identifier);
            if (!instance && this.component) {
                instance = this.component.instanceFactory(this.container, normalizeIdentifierForFactory(identifier));
                this.instances.set(identifier, instance);
            }
            return instance || null;
        };
        Provider.prototype.normalizeInstanceIdentifier = function (identifier) {
            if (this.component) {
                return this.component.multipleInstances ? identifier : DEFAULT_ENTRY_NAME;
            }
            else {
                return identifier; // assume multiple instances are supported before the component is provided.
            }
        };
        return Provider;
    }());
    // undefined should be passed to the service factory for the default instance
    function normalizeIdentifierForFactory(identifier) {
        return identifier === DEFAULT_ENTRY_NAME ? undefined : identifier;
    }
    function isComponentEager(component) {
        return component.instantiationMode === "EAGER" /* EAGER */;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * ComponentContainer that provides Providers for service name T, e.g. `auth`, `auth-internal`
     */
    var ComponentContainer = /** @class */ (function () {
        function ComponentContainer(name) {
            this.name = name;
            this.providers = new Map();
        }
        /**
         *
         * @param component Component being added
         * @param overwrite When a component with the same name has already been registered,
         * if overwrite is true: overwrite the existing component with the new component and create a new
         * provider with the new component. It can be useful in tests where you want to use different mocks
         * for different tests.
         * if overwrite is false: throw an exception
         */
        ComponentContainer.prototype.addComponent = function (component) {
            var provider = this.getProvider(component.name);
            if (provider.isComponentSet()) {
                throw new Error("Component " + component.name + " has already been registered with " + this.name);
            }
            provider.setComponent(component);
        };
        ComponentContainer.prototype.addOrOverwriteComponent = function (component) {
            var provider = this.getProvider(component.name);
            if (provider.isComponentSet()) {
                // delete the existing provider from the container, so we can register the new component
                this.providers.delete(component.name);
            }
            this.addComponent(component);
        };
        /**
         * getProvider provides a type safe interface where it can only be called with a field name
         * present in NameServiceMapping interface.
         *
         * Firebase SDKs providing services should extend NameServiceMapping interface to register
         * themselves.
         */
        ComponentContainer.prototype.getProvider = function (name) {
            if (this.providers.has(name)) {
                return this.providers.get(name);
            }
            // create a Provider for a service that hasn't registered with Firebase
            var provider = new Provider(name, this);
            this.providers.set(name, provider);
            return provider;
        };
        ComponentContainer.prototype.getProviders = function () {
            return Array.from(this.providers.values());
        };
        return ComponentContainer;
    }());

    exports.Component = Component;
    exports.ComponentContainer = ComponentContainer;
    exports.Provider = Provider;

    });

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */

    function __spreadArrays$1() {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                r[k] = a[j];
        return r;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var _a;
    /**
     * A container for all of the Logger instances
     */
    var instances = [];
    /**
     * The JS SDK supports 5 log levels and also allows a user the ability to
     * silence the logs altogether.
     *
     * The order is a follows:
     * DEBUG < VERBOSE < INFO < WARN < ERROR
     *
     * All of the log types above the current log level will be captured (i.e. if
     * you set the log level to `INFO`, errors will still be logged, but `DEBUG` and
     * `VERBOSE` logs will not)
     */
    var LogLevel;
    (function (LogLevel) {
        LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
        LogLevel[LogLevel["VERBOSE"] = 1] = "VERBOSE";
        LogLevel[LogLevel["INFO"] = 2] = "INFO";
        LogLevel[LogLevel["WARN"] = 3] = "WARN";
        LogLevel[LogLevel["ERROR"] = 4] = "ERROR";
        LogLevel[LogLevel["SILENT"] = 5] = "SILENT";
    })(LogLevel || (LogLevel = {}));
    var levelStringToEnum = {
        'debug': LogLevel.DEBUG,
        'verbose': LogLevel.VERBOSE,
        'info': LogLevel.INFO,
        'warn': LogLevel.WARN,
        'error': LogLevel.ERROR,
        'silent': LogLevel.SILENT
    };
    /**
     * The default log level
     */
    var defaultLogLevel = LogLevel.INFO;
    /**
     * By default, `console.debug` is not displayed in the developer console (in
     * chrome). To avoid forcing users to have to opt-in to these logs twice
     * (i.e. once for firebase, and once in the console), we are sending `DEBUG`
     * logs to the `console.log` function.
     */
    var ConsoleMethod = (_a = {},
        _a[LogLevel.DEBUG] = 'log',
        _a[LogLevel.VERBOSE] = 'log',
        _a[LogLevel.INFO] = 'info',
        _a[LogLevel.WARN] = 'warn',
        _a[LogLevel.ERROR] = 'error',
        _a);
    /**
     * The default log handler will forward DEBUG, VERBOSE, INFO, WARN, and ERROR
     * messages on to their corresponding console counterparts (if the log method
     * is supported by the current log level)
     */
    var defaultLogHandler = function (instance, logType) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        if (logType < instance.logLevel) {
            return;
        }
        var now = new Date().toISOString();
        var method = ConsoleMethod[logType];
        if (method) {
            console[method].apply(console, __spreadArrays$1(["[" + now + "]  " + instance.name + ":"], args));
        }
        else {
            throw new Error("Attempted to log a message with an invalid logType (value: " + logType + ")");
        }
    };
    var Logger = /** @class */ (function () {
        /**
         * Gives you an instance of a Logger to capture messages according to
         * Firebase's logging scheme.
         *
         * @param name The name that the logs will be associated with
         */
        function Logger(name) {
            this.name = name;
            /**
             * The log level of the given Logger instance.
             */
            this._logLevel = defaultLogLevel;
            /**
             * The main (internal) log handler for the Logger instance.
             * Can be set to a new function in internal package code but not by user.
             */
            this._logHandler = defaultLogHandler;
            /**
             * The optional, additional, user-defined log handler for the Logger instance.
             */
            this._userLogHandler = null;
            /**
             * Capture the current instance for later use
             */
            instances.push(this);
        }
        Object.defineProperty(Logger.prototype, "logLevel", {
            get: function () {
                return this._logLevel;
            },
            set: function (val) {
                if (!(val in LogLevel)) {
                    throw new TypeError("Invalid value \"" + val + "\" assigned to `logLevel`");
                }
                this._logLevel = val;
            },
            enumerable: false,
            configurable: true
        });
        // Workaround for setter/getter having to be the same type.
        Logger.prototype.setLogLevel = function (val) {
            this._logLevel = typeof val === 'string' ? levelStringToEnum[val] : val;
        };
        Object.defineProperty(Logger.prototype, "logHandler", {
            get: function () {
                return this._logHandler;
            },
            set: function (val) {
                if (typeof val !== 'function') {
                    throw new TypeError('Value assigned to `logHandler` must be a function');
                }
                this._logHandler = val;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Logger.prototype, "userLogHandler", {
            get: function () {
                return this._userLogHandler;
            },
            set: function (val) {
                this._userLogHandler = val;
            },
            enumerable: false,
            configurable: true
        });
        /**
         * The functions below are all based on the `console` interface
         */
        Logger.prototype.debug = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays$1([this, LogLevel.DEBUG], args));
            this._logHandler.apply(this, __spreadArrays$1([this, LogLevel.DEBUG], args));
        };
        Logger.prototype.log = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays$1([this, LogLevel.VERBOSE], args));
            this._logHandler.apply(this, __spreadArrays$1([this, LogLevel.VERBOSE], args));
        };
        Logger.prototype.info = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays$1([this, LogLevel.INFO], args));
            this._logHandler.apply(this, __spreadArrays$1([this, LogLevel.INFO], args));
        };
        Logger.prototype.warn = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays$1([this, LogLevel.WARN], args));
            this._logHandler.apply(this, __spreadArrays$1([this, LogLevel.WARN], args));
        };
        Logger.prototype.error = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays$1([this, LogLevel.ERROR], args));
            this._logHandler.apply(this, __spreadArrays$1([this, LogLevel.ERROR], args));
        };
        return Logger;
    }());
    function setLogLevel(level) {
        instances.forEach(function (inst) {
            inst.setLogLevel(level);
        });
    }
    function setUserLogHandler(logCallback, options) {
        var _loop_1 = function (instance) {
            var customLogLevel = null;
            if (options && options.level) {
                customLogLevel = levelStringToEnum[options.level];
            }
            if (logCallback === null) {
                instance.userLogHandler = null;
            }
            else {
                instance.userLogHandler = function (instance, level) {
                    var args = [];
                    for (var _i = 2; _i < arguments.length; _i++) {
                        args[_i - 2] = arguments[_i];
                    }
                    var message = args
                        .map(function (arg) {
                        if (arg == null) {
                            return null;
                        }
                        else if (typeof arg === 'string') {
                            return arg;
                        }
                        else if (typeof arg === 'number' || typeof arg === 'boolean') {
                            return arg.toString();
                        }
                        else if (arg instanceof Error) {
                            return arg.message;
                        }
                        else {
                            try {
                                return JSON.stringify(arg);
                            }
                            catch (ignored) {
                                return null;
                            }
                        }
                    })
                        .filter(function (arg) { return arg; })
                        .join(' ');
                    if (level >= (customLogLevel !== null && customLogLevel !== void 0 ? customLogLevel : instance.logLevel)) {
                        logCallback({
                            level: LogLevel[level].toLowerCase(),
                            message: message,
                            args: args,
                            type: instance.name
                        });
                    }
                };
            }
        };
        for (var _i = 0, instances_1 = instances; _i < instances_1.length; _i++) {
            var instance = instances_1[_i];
            _loop_1(instance);
        }
    }

    var index_esm = /*#__PURE__*/Object.freeze({
        __proto__: null,
        get LogLevel () { return LogLevel; },
        Logger: Logger,
        setLogLevel: setLogLevel,
        setUserLogHandler: setUserLogHandler
    });

    var index_cjs$2 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, '__esModule', { value: true });






    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var _a;
    var ERRORS = (_a = {},
        _a["no-app" /* NO_APP */] = "No Firebase App '{$appName}' has been created - " +
            'call Firebase App.initializeApp()',
        _a["bad-app-name" /* BAD_APP_NAME */] = "Illegal App name: '{$appName}",
        _a["duplicate-app" /* DUPLICATE_APP */] = "Firebase App named '{$appName}' already exists",
        _a["app-deleted" /* APP_DELETED */] = "Firebase App named '{$appName}' already deleted",
        _a["invalid-app-argument" /* INVALID_APP_ARGUMENT */] = 'firebase.{$appName}() takes either no argument or a ' +
            'Firebase App instance.',
        _a["invalid-log-argument" /* INVALID_LOG_ARGUMENT */] = 'First argument to `onLog` must be null or a function.',
        _a);
    var ERROR_FACTORY = new index_cjs.ErrorFactory('app', 'Firebase', ERRORS);

    var name$1 = "@firebase/app";
    var version = "0.6.10";

    var name$2 = "@firebase/analytics";

    var name$3 = "@firebase/auth";

    var name$4 = "@firebase/database";

    var name$5 = "@firebase/functions";

    var name$6 = "@firebase/installations";

    var name$7 = "@firebase/messaging";

    var name$8 = "@firebase/performance";

    var name$9 = "@firebase/remote-config";

    var name$a = "@firebase/storage";

    var name$b = "@firebase/firestore";

    var name$c = "firebase-wrapper";

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var _a$1;
    var DEFAULT_ENTRY_NAME = '[DEFAULT]';
    var PLATFORM_LOG_STRING = (_a$1 = {},
        _a$1[name$1] = 'fire-core',
        _a$1[name$2] = 'fire-analytics',
        _a$1[name$3] = 'fire-auth',
        _a$1[name$4] = 'fire-rtdb',
        _a$1[name$5] = 'fire-fn',
        _a$1[name$6] = 'fire-iid',
        _a$1[name$7] = 'fire-fcm',
        _a$1[name$8] = 'fire-perf',
        _a$1[name$9] = 'fire-rc',
        _a$1[name$a] = 'fire-gcs',
        _a$1[name$b] = 'fire-fst',
        _a$1['fire-js'] = 'fire-js',
        _a$1[name$c] = 'fire-js-all',
        _a$1);

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var logger = new index_esm.Logger('@firebase/app');

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Global context object for a collection of services using
     * a shared authentication state.
     */
    var FirebaseAppImpl = /** @class */ (function () {
        function FirebaseAppImpl(options, config, firebase_) {
            var e_1, _a;
            var _this = this;
            this.firebase_ = firebase_;
            this.isDeleted_ = false;
            this.name_ = config.name;
            this.automaticDataCollectionEnabled_ =
                config.automaticDataCollectionEnabled || false;
            this.options_ = index_cjs.deepCopy(options);
            this.container = new index_cjs$1.ComponentContainer(config.name);
            // add itself to container
            this._addComponent(new index_cjs$1.Component('app', function () { return _this; }, "PUBLIC" /* PUBLIC */));
            try {
                // populate ComponentContainer with existing components
                for (var _b = tslib_es6.__values(this.firebase_.INTERNAL.components.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var component$1 = _c.value;
                    this._addComponent(component$1);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        Object.defineProperty(FirebaseAppImpl.prototype, "automaticDataCollectionEnabled", {
            get: function () {
                this.checkDestroyed_();
                return this.automaticDataCollectionEnabled_;
            },
            set: function (val) {
                this.checkDestroyed_();
                this.automaticDataCollectionEnabled_ = val;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(FirebaseAppImpl.prototype, "name", {
            get: function () {
                this.checkDestroyed_();
                return this.name_;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(FirebaseAppImpl.prototype, "options", {
            get: function () {
                this.checkDestroyed_();
                return this.options_;
            },
            enumerable: false,
            configurable: true
        });
        FirebaseAppImpl.prototype.delete = function () {
            var _this = this;
            return new Promise(function (resolve) {
                _this.checkDestroyed_();
                resolve();
            })
                .then(function () {
                _this.firebase_.INTERNAL.removeApp(_this.name_);
                return Promise.all(_this.container.getProviders().map(function (provider) { return provider.delete(); }));
            })
                .then(function () {
                _this.isDeleted_ = true;
            });
        };
        /**
         * Return a service instance associated with this app (creating it
         * on demand), identified by the passed instanceIdentifier.
         *
         * NOTE: Currently storage and functions are the only ones that are leveraging this
         * functionality. They invoke it by calling:
         *
         * ```javascript
         * firebase.app().storage('STORAGE BUCKET ID')
         * ```
         *
         * The service name is passed to this already
         * @internal
         */
        FirebaseAppImpl.prototype._getService = function (name, instanceIdentifier) {
            if (instanceIdentifier === void 0) { instanceIdentifier = DEFAULT_ENTRY_NAME; }
            this.checkDestroyed_();
            // getImmediate will always succeed because _getService is only called for registered components.
            return this.container.getProvider(name).getImmediate({
                identifier: instanceIdentifier
            });
        };
        /**
         * Remove a service instance from the cache, so we will create a new instance for this service
         * when people try to get this service again.
         *
         * NOTE: currently only firestore is using this functionality to support firestore shutdown.
         *
         * @param name The service name
         * @param instanceIdentifier instance identifier in case multiple instances are allowed
         * @internal
         */
        FirebaseAppImpl.prototype._removeServiceInstance = function (name, instanceIdentifier) {
            if (instanceIdentifier === void 0) { instanceIdentifier = DEFAULT_ENTRY_NAME; }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.container.getProvider(name).clearInstance(instanceIdentifier);
        };
        /**
         * @param component the component being added to this app's container
         */
        FirebaseAppImpl.prototype._addComponent = function (component) {
            try {
                this.container.addComponent(component);
            }
            catch (e) {
                logger.debug("Component " + component.name + " failed to register with FirebaseApp " + this.name, e);
            }
        };
        FirebaseAppImpl.prototype._addOrOverwriteComponent = function (component) {
            this.container.addOrOverwriteComponent(component);
        };
        /**
         * This function will throw an Error if the App has already been deleted -
         * use before performing API actions on the App.
         */
        FirebaseAppImpl.prototype.checkDestroyed_ = function () {
            if (this.isDeleted_) {
                throw ERROR_FACTORY.create("app-deleted" /* APP_DELETED */, { appName: this.name_ });
            }
        };
        return FirebaseAppImpl;
    }());
    // Prevent dead-code elimination of these methods w/o invalid property
    // copying.
    (FirebaseAppImpl.prototype.name && FirebaseAppImpl.prototype.options) ||
        FirebaseAppImpl.prototype.delete ||
        console.log('dc');

    var version$1 = "7.18.0";

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Because auth can't share code with other components, we attach the utility functions
     * in an internal namespace to share code.
     * This function return a firebase namespace object without
     * any utility functions, so it can be shared between the regular firebaseNamespace and
     * the lite version.
     */
    function createFirebaseNamespaceCore(firebaseAppImpl) {
        var apps = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        var components = new Map();
        // A namespace is a plain JavaScript Object.
        var namespace = {
            // Hack to prevent Babel from modifying the object returned
            // as the firebase namespace.
            // @ts-ignore
            __esModule: true,
            initializeApp: initializeApp,
            // @ts-ignore
            app: app,
            registerVersion: registerVersion,
            setLogLevel: index_esm.setLogLevel,
            onLog: onLog,
            // @ts-ignore
            apps: null,
            SDK_VERSION: version$1,
            INTERNAL: {
                registerComponent: registerComponent,
                removeApp: removeApp,
                components: components,
                useAsService: useAsService
            }
        };
        // Inject a circular default export to allow Babel users who were previously
        // using:
        //
        //   import firebase from 'firebase';
        //   which becomes: var firebase = require('firebase').default;
        //
        // instead of
        //
        //   import * as firebase from 'firebase';
        //   which becomes: var firebase = require('firebase');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        namespace['default'] = namespace;
        // firebase.apps is a read-only getter.
        Object.defineProperty(namespace, 'apps', {
            get: getApps
        });
        /**
         * Called by App.delete() - but before any services associated with the App
         * are deleted.
         */
        function removeApp(name) {
            delete apps[name];
        }
        /**
         * Get the App object for a given name (or DEFAULT).
         */
        function app(name) {
            name = name || DEFAULT_ENTRY_NAME;
            if (!index_cjs.contains(apps, name)) {
                throw ERROR_FACTORY.create("no-app" /* NO_APP */, { appName: name });
            }
            return apps[name];
        }
        // @ts-ignore
        app['App'] = firebaseAppImpl;
        function initializeApp(options, rawConfig) {
            if (rawConfig === void 0) { rawConfig = {}; }
            if (typeof rawConfig !== 'object' || rawConfig === null) {
                var name_1 = rawConfig;
                rawConfig = { name: name_1 };
            }
            var config = rawConfig;
            if (config.name === undefined) {
                config.name = DEFAULT_ENTRY_NAME;
            }
            var name = config.name;
            if (typeof name !== 'string' || !name) {
                throw ERROR_FACTORY.create("bad-app-name" /* BAD_APP_NAME */, {
                    appName: String(name)
                });
            }
            if (index_cjs.contains(apps, name)) {
                throw ERROR_FACTORY.create("duplicate-app" /* DUPLICATE_APP */, { appName: name });
            }
            var app = new firebaseAppImpl(options, config, namespace);
            apps[name] = app;
            return app;
        }
        /*
         * Return an array of all the non-deleted FirebaseApps.
         */
        function getApps() {
            // Make a copy so caller cannot mutate the apps list.
            return Object.keys(apps).map(function (name) { return apps[name]; });
        }
        function registerComponent(component) {
            var e_1, _a;
            var componentName = component.name;
            if (components.has(componentName)) {
                logger.debug("There were multiple attempts to register component " + componentName + ".");
                return component.type === "PUBLIC" /* PUBLIC */
                    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        namespace[componentName]
                    : null;
            }
            components.set(componentName, component);
            // create service namespace for public components
            if (component.type === "PUBLIC" /* PUBLIC */) {
                // The Service namespace is an accessor function ...
                var serviceNamespace = function (appArg) {
                    if (appArg === void 0) { appArg = app(); }
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (typeof appArg[componentName] !== 'function') {
                        // Invalid argument.
                        // This happens in the following case: firebase.storage('gs:/')
                        throw ERROR_FACTORY.create("invalid-app-argument" /* INVALID_APP_ARGUMENT */, {
                            appName: componentName
                        });
                    }
                    // Forward service instance lookup to the FirebaseApp.
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return appArg[componentName]();
                };
                // ... and a container for service-level properties.
                if (component.serviceProps !== undefined) {
                    index_cjs.deepExtend(serviceNamespace, component.serviceProps);
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                namespace[componentName] = serviceNamespace;
                // Patch the FirebaseAppImpl prototype
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                firebaseAppImpl.prototype[componentName] =
                    // TODO: The eslint disable can be removed and the 'ignoreRestArgs'
                    // option added to the no-explicit-any rule when ESlint releases it.
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    function () {
                        var args = [];
                        for (var _i = 0; _i < arguments.length; _i++) {
                            args[_i] = arguments[_i];
                        }
                        var serviceFxn = this._getService.bind(this, componentName);
                        return serviceFxn.apply(this, component.multipleInstances ? args : []);
                    };
            }
            try {
                // add the component to existing app instances
                for (var _b = tslib_es6.__values(Object.keys(apps)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var appName = _c.value;
                    apps[appName]._addComponent(component);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return component.type === "PUBLIC" /* PUBLIC */
                ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    namespace[componentName]
                : null;
        }
        function registerVersion(libraryKeyOrName, version, variant) {
            var _a;
            // TODO: We can use this check to whitelist strings when/if we set up
            // a good whitelist system.
            var library = (_a = PLATFORM_LOG_STRING[libraryKeyOrName]) !== null && _a !== void 0 ? _a : libraryKeyOrName;
            if (variant) {
                library += "-" + variant;
            }
            var libraryMismatch = library.match(/\s|\//);
            var versionMismatch = version.match(/\s|\//);
            if (libraryMismatch || versionMismatch) {
                var warning = [
                    "Unable to register library \"" + library + "\" with version \"" + version + "\":"
                ];
                if (libraryMismatch) {
                    warning.push("library name \"" + library + "\" contains illegal characters (whitespace or \"/\")");
                }
                if (libraryMismatch && versionMismatch) {
                    warning.push('and');
                }
                if (versionMismatch) {
                    warning.push("version name \"" + version + "\" contains illegal characters (whitespace or \"/\")");
                }
                logger.warn(warning.join(' '));
                return;
            }
            registerComponent(new index_cjs$1.Component(library + "-version", function () { return ({ library: library, version: version }); }, "VERSION" /* VERSION */));
        }
        function onLog(logCallback, options) {
            if (logCallback !== null && typeof logCallback !== 'function') {
                throw ERROR_FACTORY.create("invalid-log-argument" /* INVALID_LOG_ARGUMENT */, {
                    appName: name
                });
            }
            index_esm.setUserLogHandler(logCallback, options);
        }
        // Map the requested service to a registered service name
        // (used to map auth to serverAuth service when needed).
        function useAsService(app, name) {
            if (name === 'serverAuth') {
                return null;
            }
            var useService = name;
            return useService;
        }
        return namespace;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Return a firebase namespace object.
     *
     * In production, this will be called exactly once and the result
     * assigned to the 'firebase' global.  It may be called multiple times
     * in unit tests.
     */
    function createFirebaseNamespace() {
        var namespace = createFirebaseNamespaceCore(FirebaseAppImpl);
        namespace.INTERNAL = tslib_es6.__assign(tslib_es6.__assign({}, namespace.INTERNAL), { createFirebaseNamespace: createFirebaseNamespace,
            extendNamespace: extendNamespace,
            createSubscribe: index_cjs.createSubscribe,
            ErrorFactory: index_cjs.ErrorFactory,
            deepExtend: index_cjs.deepExtend });
        /**
         * Patch the top-level firebase namespace with additional properties.
         *
         * firebase.INTERNAL.extendNamespace()
         */
        function extendNamespace(props) {
            index_cjs.deepExtend(namespace, props);
        }
        return namespace;
    }
    var firebase = createFirebaseNamespace();

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var PlatformLoggerService = /** @class */ (function () {
        function PlatformLoggerService(container) {
            this.container = container;
        }
        // In initial implementation, this will be called by installations on
        // auth token refresh, and installations will send this string.
        PlatformLoggerService.prototype.getPlatformInfoString = function () {
            var providers = this.container.getProviders();
            // Loop through providers and get library/version pairs from any that are
            // version components.
            return providers
                .map(function (provider) {
                if (isVersionServiceProvider(provider)) {
                    var service = provider.getImmediate();
                    return service.library + "/" + service.version;
                }
                else {
                    return null;
                }
            })
                .filter(function (logString) { return logString; })
                .join(' ');
        };
        return PlatformLoggerService;
    }());
    /**
     *
     * @param provider check if this provider provides a VersionService
     *
     * NOTE: Using Provider<'app-version'> is a hack to indicate that the provider
     * provides VersionService. The provider is not necessarily a 'app-version'
     * provider.
     */
    function isVersionServiceProvider(provider) {
        var component = provider.getComponent();
        return (component === null || component === void 0 ? void 0 : component.type) === "VERSION" /* VERSION */;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function registerCoreComponents(firebase, variant) {
        firebase.INTERNAL.registerComponent(new index_cjs$1.Component('platform-logger', function (container) { return new PlatformLoggerService(container); }, "PRIVATE" /* PRIVATE */));
        // Register `app` package.
        firebase.registerVersion(name$1, version, variant);
        // Register platform SDK identifier (no version).
        firebase.registerVersion('fire-js', '');
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // Firebase Lite detection test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (index_cjs.isBrowser() && self.firebase !== undefined) {
        logger.warn("\n    Warning: Firebase is already defined in the global scope. Please make sure\n    Firebase library is only loaded once.\n  ");
        // eslint-disable-next-line
        var sdkVersion = self.firebase.SDK_VERSION;
        if (sdkVersion && sdkVersion.indexOf('LITE') >= 0) {
            logger.warn("\n    Warning: You are trying to load Firebase while using Firebase Performance standalone script.\n    You should load Firebase Performance with this instance of Firebase to avoid loading duplicate code.\n    ");
        }
    }
    var initializeApp = firebase.initializeApp;
    // TODO: This disable can be removed and the 'ignoreRestArgs' option added to
    // the no-explicit-any rule when ESlint releases it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    firebase.initializeApp = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        // Environment check before initializing app
        // Do the check in initializeApp, so people have a chance to disable it by setting logLevel
        // in @firebase/logger
        if (index_cjs.isNode()) {
            logger.warn("\n      Warning: This is a browser-targeted Firebase bundle but it appears it is being\n      run in a Node environment.  If running in a Node environment, make sure you\n      are using the bundle specified by the \"main\" field in package.json.\n      \n      If you are using Webpack, you can specify \"main\" as the first item in\n      \"resolve.mainFields\":\n      https://webpack.js.org/configuration/resolve/#resolvemainfields\n      \n      If using Rollup, use the rollup-plugin-node-resolve plugin and specify \"main\"\n      as the first item in \"mainFields\", e.g. ['main', 'module'].\n      https://github.com/rollup/rollup-plugin-node-resolve\n      ");
        }
        return initializeApp.apply(undefined, args);
    };
    var firebase$1 = firebase;
    registerCoreComponents(firebase$1);

    exports.default = firebase$1;
    exports.firebase = firebase$1;

    });

    function _interopDefaultLegacy$1 (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

    var firebase__default = /*#__PURE__*/_interopDefaultLegacy$1(index_cjs$2);

    var name$1 = "firebase";
    var version = "7.19.1";

    /**
     * @license
     * Copyright 2018 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    firebase__default['default'].registerVersion(name$1, version, 'app');

    var index_cjs$3 = firebase__default['default'];

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics$1 = function(d, b) {
        extendStatics$1 = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics$1(d, b);
    };

    function __extends$1(d, b) {
        extendStatics$1(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    function __values$1(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m) return m.call(o);
        if (o && typeof o.length === "number") return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    }

    var commonjsGlobal$1 = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    var g, goog = goog || {}, k = commonjsGlobal$1 || self;
    function aa() { }
    function ba(a) { var b = typeof a; return "object" != b ? b : a ? Array.isArray(a) ? "array" : b : "null"; }
    function ca(a) { var b = ba(a); return "array" == b || "object" == b && "number" == typeof a.length; }
    function n(a) { var b = typeof a; return "object" == b && null != a || "function" == b; }
    function da(a) { return Object.prototype.hasOwnProperty.call(a, ea) && a[ea] || (a[ea] = ++fa); }
    var ea = "closure_uid_" + (1E9 * Math.random() >>> 0), fa = 0;
    function ha(a, b, c) { return a.call.apply(a.bind, arguments); }
    function ja(a, b, c) { if (!a)
        throw Error(); if (2 < arguments.length) {
        var d = Array.prototype.slice.call(arguments, 2);
        return function () { var e = Array.prototype.slice.call(arguments); Array.prototype.unshift.apply(e, d); return a.apply(b, e); };
    } return function () { return a.apply(b, arguments); }; }
    function p(a, b, c) { Function.prototype.bind && -1 != Function.prototype.bind.toString().indexOf("native code") ? p = ha : p = ja; return p.apply(null, arguments); }
    function ka(a, b) { var c = Array.prototype.slice.call(arguments, 1); return function () { var d = c.slice(); d.push.apply(d, arguments); return a.apply(this, d); }; }
    var q = Date.now;
    function r(a, b) { function c() { } c.prototype = b.prototype; a.S = b.prototype; a.prototype = new c; a.prototype.constructor = a; }
    function u() { this.j = this.j; this.i = this.i; }
    var la = 0;
    u.prototype.j = !1;
    u.prototype.ja = function () { if (!this.j && (this.j = !0, this.G(), 0 != la)) {
        var a = da(this);
    } };
    u.prototype.G = function () { if (this.i)
        for (; this.i.length;)
            this.i.shift()(); };
    var na = Array.prototype.indexOf ? function (a, b) { return Array.prototype.indexOf.call(a, b, void 0); } : function (a, b) { if ("string" === typeof a)
        return "string" !== typeof b || 1 != b.length ? -1 : a.indexOf(b, 0); for (var c = 0; c < a.length; c++)
        if (c in a && a[c] === b)
            return c; return -1; }, oa = Array.prototype.forEach ? function (a, b, c) { Array.prototype.forEach.call(a, b, c); } : function (a, b, c) { for (var d = a.length, e = "string" === typeof a ? a.split("") : a, f = 0; f < d; f++)
        f in e && b.call(c, e[f], f, a); };
    function pa(a) { a: {
        var b = qa;
        for (var c = a.length, d = "string" === typeof a ? a.split("") : a, e = 0; e < c; e++)
            if (e in d && b.call(void 0, d[e], e, a)) {
                b = e;
                break a;
            }
        b = -1;
    } return 0 > b ? null : "string" === typeof a ? a.charAt(b) : a[b]; }
    function ra(a) { return Array.prototype.concat.apply([], arguments); }
    function sa(a) { var b = a.length; if (0 < b) {
        for (var c = Array(b), d = 0; d < b; d++)
            c[d] = a[d];
        return c;
    } return []; }
    function ta(a) { return /^[\s\xa0]*$/.test(a); }
    var ua = String.prototype.trim ? function (a) { return a.trim(); } : function (a) { return /^[\s\xa0]*([\s\S]*?)[\s\xa0]*$/.exec(a)[1]; };
    function v(a, b) { return -1 != a.indexOf(b); }
    function xa(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
    var w;
    a: {
        var ya = k.navigator;
        if (ya) {
            var za = ya.userAgent;
            if (za) {
                w = za;
                break a;
            }
        }
        w = "";
    }
    function Aa(a, b, c) { for (var d in a)
        b.call(c, a[d], d, a); }
    function Ba(a) { var b = {}; for (var c in a)
        b[c] = a[c]; return b; }
    var Ca = "constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");
    function Da(a, b) { var c, d; for (var e = 1; e < arguments.length; e++) {
        d = arguments[e];
        for (c in d)
            a[c] = d[c];
        for (var f = 0; f < Ca.length; f++)
            c = Ca[f], Object.prototype.hasOwnProperty.call(d, c) && (a[c] = d[c]);
    } }
    function Ea(a) { Ea[" "](a); return a; }
    Ea[" "] = aa;
    function Fa(a, b) { var c = Ga; return Object.prototype.hasOwnProperty.call(c, a) ? c[a] : c[a] = b(a); }
    var Ha = v(w, "Opera"), x = v(w, "Trident") || v(w, "MSIE"), Ia = v(w, "Edge"), Ja = Ia || x, Ka = v(w, "Gecko") && !(v(w.toLowerCase(), "webkit") && !v(w, "Edge")) && !(v(w, "Trident") || v(w, "MSIE")) && !v(w, "Edge"), La = v(w.toLowerCase(), "webkit") && !v(w, "Edge");
    function Ma() { var a = k.document; return a ? a.documentMode : void 0; }
    var Na;
    a: {
        var Oa = "", Pa = function () { var a = w; if (Ka)
            return /rv:([^\);]+)(\)|;)/.exec(a); if (Ia)
            return /Edge\/([\d\.]+)/.exec(a); if (x)
            return /\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/.exec(a); if (La)
            return /WebKit\/(\S+)/.exec(a); if (Ha)
            return /(?:Version)[ \/]?(\S+)/.exec(a); }();
        Pa && (Oa = Pa ? Pa[1] : "");
        if (x) {
            var Qa = Ma();
            if (null != Qa && Qa > parseFloat(Oa)) {
                Na = String(Qa);
                break a;
            }
        }
        Na = Oa;
    }
    var Ga = {};
    function Ra(a) { return Fa(a, function () { {
        var b = 0;
        var e = ua(String(Na)).split("."), f = ua(String(a)).split("."), h = Math.max(e.length, f.length);
        for (var m = 0; 0 == b && m < h; m++) {
            var c = e[m] || "", d = f[m] || "";
            do {
                c = /(\d*)(\D*)(.*)/.exec(c) || ["", "", "", ""];
                d = /(\d*)(\D*)(.*)/.exec(d) || ["", "", "", ""];
                if (0 == c[0].length && 0 == d[0].length)
                    break;
                b = xa(0 == c[1].length ? 0 : parseInt(c[1], 10), 0 == d[1].length ? 0 : parseInt(d[1], 10)) || xa(0 == c[2].length, 0 == d[2].length) || xa(c[2], d[2]);
                c = c[3];
                d = d[3];
            } while (0 == b);
        }
    } return 0 <= b; }); }
    var Sa;
    if (k.document && x) {
        var Ta = Ma();
        Sa = Ta ? Ta : parseInt(Na, 10) || void 0;
    }
    else
        Sa = void 0;
    var Ua = Sa;
    var Va = !x || 9 <= Number(Ua), Wa = x && !Ra("9"), Xa = function () { if (!k.addEventListener || !Object.defineProperty)
        return !1; var a = !1, b = Object.defineProperty({}, "passive", { get: function () { a = !0; } }); try {
        k.addEventListener("test", aa, b), k.removeEventListener("test", aa, b);
    }
    catch (c) { } return a; }();
    function y(a, b) { this.type = a; this.a = this.target = b; this.defaultPrevented = !1; }
    y.prototype.b = function () { this.defaultPrevented = !0; };
    function A(a, b) {
        y.call(this, a ? a.type : "");
        this.relatedTarget = this.a = this.target = null;
        this.button = this.screenY = this.screenX = this.clientY = this.clientX = 0;
        this.key = "";
        this.metaKey = this.shiftKey = this.altKey = this.ctrlKey = !1;
        this.pointerId = 0;
        this.pointerType = "";
        this.c = null;
        if (a) {
            var c = this.type = a.type, d = a.changedTouches && a.changedTouches.length ? a.changedTouches[0] : null;
            this.target = a.target || a.srcElement;
            this.a = b;
            if (b = a.relatedTarget) {
                if (Ka) {
                    a: {
                        try {
                            Ea(b.nodeName);
                            var e = !0;
                            break a;
                        }
                        catch (f) { }
                        e = !1;
                    }
                    e || (b = null);
                }
            }
            else
                "mouseover" ==
                    c ? b = a.fromElement : "mouseout" == c && (b = a.toElement);
            this.relatedTarget = b;
            d ? (this.clientX = void 0 !== d.clientX ? d.clientX : d.pageX, this.clientY = void 0 !== d.clientY ? d.clientY : d.pageY, this.screenX = d.screenX || 0, this.screenY = d.screenY || 0) : (this.clientX = void 0 !== a.clientX ? a.clientX : a.pageX, this.clientY = void 0 !== a.clientY ? a.clientY : a.pageY, this.screenX = a.screenX || 0, this.screenY = a.screenY || 0);
            this.button = a.button;
            this.key = a.key || "";
            this.ctrlKey = a.ctrlKey;
            this.altKey = a.altKey;
            this.shiftKey = a.shiftKey;
            this.metaKey =
                a.metaKey;
            this.pointerId = a.pointerId || 0;
            this.pointerType = "string" === typeof a.pointerType ? a.pointerType : Ya[a.pointerType] || "";
            this.c = a;
            a.defaultPrevented && this.b();
        }
    }
    r(A, y);
    var Ya = { 2: "touch", 3: "pen", 4: "mouse" };
    A.prototype.b = function () { A.S.b.call(this); var a = this.c; if (a.preventDefault)
        a.preventDefault();
    else if (a.returnValue = !1, Wa)
        try {
            if (a.ctrlKey || 112 <= a.keyCode && 123 >= a.keyCode)
                a.keyCode = -1;
        }
        catch (b) { } };
    var C = "closure_listenable_" + (1E6 * Math.random() | 0), Za = 0;
    function $a(a, b, c, d, e) { this.listener = a; this.proxy = null; this.src = b; this.type = c; this.capture = !!d; this.ca = e; this.key = ++Za; this.Y = this.Z = !1; }
    function ab(a) { a.Y = !0; a.listener = null; a.proxy = null; a.src = null; a.ca = null; }
    function bb(a) { this.src = a; this.a = {}; this.b = 0; }
    bb.prototype.add = function (a, b, c, d, e) { var f = a.toString(); a = this.a[f]; a || (a = this.a[f] = [], this.b++); var h = cb(a, b, d, e); -1 < h ? (b = a[h], c || (b.Z = !1)) : (b = new $a(b, this.src, f, !!d, e), b.Z = c, a.push(b)); return b; };
    function db(a, b) { var c = b.type; if (c in a.a) {
        var d = a.a[c], e = na(d, b), f;
        (f = 0 <= e) && Array.prototype.splice.call(d, e, 1);
        f && (ab(b), 0 == a.a[c].length && (delete a.a[c], a.b--));
    } }
    function cb(a, b, c, d) { for (var e = 0; e < a.length; ++e) {
        var f = a[e];
        if (!f.Y && f.listener == b && f.capture == !!c && f.ca == d)
            return e;
    } return -1; }
    var eb = "closure_lm_" + (1E6 * Math.random() | 0), fb = {};
    function hb(a, b, c, d, e) { if (d && d.once)
        return ib(a, b, c, d, e); if (Array.isArray(b)) {
        for (var f = 0; f < b.length; f++)
            hb(a, b[f], c, d, e);
        return null;
    } c = jb(c); return a && a[C] ? a.va(b, c, n(d) ? !!d.capture : !!d, e) : kb(a, b, c, !1, d, e); }
    function kb(a, b, c, d, e, f) {
        if (!b)
            throw Error("Invalid event type");
        var h = n(e) ? !!e.capture : !!e;
        if (h && !Va)
            return null;
        var m = lb(a);
        m || (a[eb] = m = new bb(a));
        c = m.add(b, c, d, h, f);
        if (c.proxy)
            return c;
        d = mb();
        c.proxy = d;
        d.src = a;
        d.listener = c;
        if (a.addEventListener)
            Xa || (e = h), void 0 === e && (e = !1), a.addEventListener(b.toString(), d, e);
        else if (a.attachEvent)
            a.attachEvent(nb(b.toString()), d);
        else if (a.addListener && a.removeListener)
            a.addListener(d);
        else
            throw Error("addEventListener and attachEvent are unavailable.");
        return c;
    }
    function mb() { var a = ob, b = Va ? function (c) { return a.call(b.src, b.listener, c); } : function (c) { c = a.call(b.src, b.listener, c); if (!c)
        return c; }; return b; }
    function ib(a, b, c, d, e) { if (Array.isArray(b)) {
        for (var f = 0; f < b.length; f++)
            ib(a, b[f], c, d, e);
        return null;
    } c = jb(c); return a && a[C] ? a.wa(b, c, n(d) ? !!d.capture : !!d, e) : kb(a, b, c, !0, d, e); }
    function pb(a, b, c, d, e) { if (Array.isArray(b))
        for (var f = 0; f < b.length; f++)
            pb(a, b[f], c, d, e);
    else
        (d = n(d) ? !!d.capture : !!d, c = jb(c), a && a[C]) ? (a = a.c, b = String(b).toString(), b in a.a && (f = a.a[b], c = cb(f, c, d, e), -1 < c && (ab(f[c]), Array.prototype.splice.call(f, c, 1), 0 == f.length && (delete a.a[b], a.b--)))) : a && (a = lb(a)) && (b = a.a[b.toString()], a = -1, b && (a = cb(b, c, d, e)), (c = -1 < a ? b[a] : null) && rb(c)); }
    function rb(a) { if ("number" !== typeof a && a && !a.Y) {
        var b = a.src;
        if (b && b[C])
            db(b.c, a);
        else {
            var c = a.type, d = a.proxy;
            b.removeEventListener ? b.removeEventListener(c, d, a.capture) : b.detachEvent ? b.detachEvent(nb(c), d) : b.addListener && b.removeListener && b.removeListener(d);
            (c = lb(b)) ? (db(c, a), 0 == c.b && (c.src = null, b[eb] = null)) : ab(a);
        }
    } }
    function nb(a) { return a in fb ? fb[a] : fb[a] = "on" + a; }
    function sb(a, b) { var c = a.listener, d = a.ca || a.src; a.Z && rb(a); return c.call(d, b); }
    function ob(a, b) { if (a.Y)
        return !0; if (!Va) {
        if (!b)
            a: {
                b = ["window", "event"];
                for (var c = k, d = 0; d < b.length; d++)
                    if (c = c[b[d]], null == c) {
                        b = null;
                        break a;
                    }
                b = c;
            }
        b = new A(b, this);
        return sb(a, b);
    } return sb(a, new A(b, this)); }
    function lb(a) { a = a[eb]; return a instanceof bb ? a : null; }
    var tb = "__closure_events_fn_" + (1E9 * Math.random() >>> 0);
    function jb(a) { if ("function" == ba(a))
        return a; a[tb] || (a[tb] = function (b) { return a.handleEvent(b); }); return a[tb]; }
    function D() { u.call(this); this.c = new bb(this); this.J = this; this.C = null; }
    r(D, u);
    D.prototype[C] = !0;
    g = D.prototype;
    g.addEventListener = function (a, b, c, d) { hb(this, a, b, c, d); };
    g.removeEventListener = function (a, b, c, d) { pb(this, a, b, c, d); };
    g.dispatchEvent = function (a) { var b, c = this.C; if (c)
        for (b = []; c; c = c.C)
            b.push(c); c = this.J; var d = a.type || a; if ("string" === typeof a)
        a = new y(a, c);
    else if (a instanceof y)
        a.target = a.target || c;
    else {
        var e = a;
        a = new y(d, c);
        Da(a, e);
    } e = !0; if (b)
        for (var f = b.length - 1; 0 <= f; f--) {
            var h = a.a = b[f];
            e = ub(h, d, !0, a) && e;
        } h = a.a = c; e = ub(h, d, !0, a) && e; e = ub(h, d, !1, a) && e; if (b)
        for (f = 0; f < b.length; f++)
            h = a.a = b[f], e = ub(h, d, !1, a) && e; return e; };
    g.G = function () { D.S.G.call(this); if (this.c) {
        var a = this.c, c;
        for (c in a.a) {
            for (var d = a.a[c], e = 0; e < d.length; e++)
                ab(d[e]);
            delete a.a[c];
            a.b--;
        }
    } this.C = null; };
    g.va = function (a, b, c, d) { return this.c.add(String(a), b, !1, c, d); };
    g.wa = function (a, b, c, d) { return this.c.add(String(a), b, !0, c, d); };
    function ub(a, b, c, d) { b = a.c.a[String(b)]; if (!b)
        return !0; b = b.concat(); for (var e = !0, f = 0; f < b.length; ++f) {
        var h = b[f];
        if (h && !h.Y && h.capture == c) {
            var m = h.listener, l = h.ca || h.src;
            h.Z && db(a.c, h);
            e = !1 !== m.call(l, d) && e;
        }
    } return e && !d.defaultPrevented; }
    var vb = k.JSON.stringify;
    function wb() { this.b = this.a = null; }
    var yb = new /** @class */ (function () {
        function class_1(a, b, c) {
            this.f = c;
            this.c = a;
            this.g = b;
            this.b = 0;
            this.a = null;
        }
        class_1.prototype.get = function () { var a; 0 < this.b ? (this.b--, a = this.a, this.a = a.next, a.next = null) : a = this.c(); return a; };
        return class_1;
    }())(function () { return new xb; }, function (a) { a.reset(); }, 100);
    wb.prototype.add = function (a, b) { var c = yb.get(); c.set(a, b); this.b ? this.b.next = c : this.a = c; this.b = c; };
    function zb() { var a = Ab, b = null; a.a && (b = a.a, a.a = a.a.next, a.a || (a.b = null), b.next = null); return b; }
    function xb() { this.next = this.b = this.a = null; }
    xb.prototype.set = function (a, b) { this.a = a; this.b = b; this.next = null; };
    xb.prototype.reset = function () { this.next = this.b = this.a = null; };
    function Bb(a) { k.setTimeout(function () { throw a; }, 0); }
    function Cb(a, b) { Db || Eb(); Fb || (Db(), Fb = !0); Ab.add(a, b); }
    var Db;
    function Eb() { var a = k.Promise.resolve(void 0); Db = function () { a.then(Gb); }; }
    var Fb = !1, Ab = new wb;
    function Gb() { for (var a; a = zb();) {
        try {
            a.a.call(a.b);
        }
        catch (c) {
            Bb(c);
        }
        var b = yb;
        b.g(a);
        b.b < b.f && (b.b++, a.next = b.a, b.a = a);
    } Fb = !1; }
    function Hb(a, b) { D.call(this); this.b = a || 1; this.a = b || k; this.f = p(this.Ya, this); this.g = q(); }
    r(Hb, D);
    g = Hb.prototype;
    g.aa = !1;
    g.M = null;
    g.Ya = function () { if (this.aa) {
        var a = q() - this.g;
        0 < a && a < .8 * this.b ? this.M = this.a.setTimeout(this.f, this.b - a) : (this.M && (this.a.clearTimeout(this.M), this.M = null), this.dispatchEvent("tick"), this.aa && (Ib(this), this.start()));
    } };
    g.start = function () { this.aa = !0; this.M || (this.M = this.a.setTimeout(this.f, this.b), this.g = q()); };
    function Ib(a) { a.aa = !1; a.M && (a.a.clearTimeout(a.M), a.M = null); }
    g.G = function () { Hb.S.G.call(this); Ib(this); delete this.a; };
    function Jb(a, b, c) { if ("function" == ba(a))
        c && (a = p(a, c));
    else if (a && "function" == typeof a.handleEvent)
        a = p(a.handleEvent, a);
    else
        throw Error("Invalid listener argument"); return 2147483647 < Number(b) ? -1 : k.setTimeout(a, b || 0); }
    function Kb(a) { a.a = Jb(function () { a.a = null; a.c && (a.c = !1, Kb(a)); }, a.h); var b = a.b; a.b = null; a.g.apply(null, b); }
    var Lb = /** @class */ (function (_super) {
        __extends$1(Lb, _super);
        function Lb(a, b, c) {
            var _this = _super.call(this) || this;
            _this.g = null != c ? a.bind(c) : a;
            _this.h = b;
            _this.b = null;
            _this.c = !1;
            _this.a = null;
            return _this;
        }
        Lb.prototype.f = function (a) { this.b = arguments; this.a ? this.c = !0 : Kb(this); };
        Lb.prototype.G = function () { _super.prototype.G.call(this); this.a && (k.clearTimeout(this.a), this.a = null, this.c = !1, this.b = null); };
        return Lb;
    }(u));
    function E(a) { u.call(this); this.b = a; this.a = {}; }
    r(E, u);
    var Mb = [];
    function Nb(a, b, c, d) { Array.isArray(c) || (c && (Mb[0] = c.toString()), c = Mb); for (var e = 0; e < c.length; e++) {
        var f = hb(b, c[e], d || a.handleEvent, !1, a.b || a);
        if (!f)
            break;
        a.a[f.key] = f;
    } }
    function Ob(a) { Aa(a.a, function (b, c) { this.a.hasOwnProperty(c) && rb(b); }, a); a.a = {}; }
    E.prototype.G = function () { E.S.G.call(this); Ob(this); };
    E.prototype.handleEvent = function () { throw Error("EventHandler.handleEvent not implemented"); };
    function Pb() { this.a = !0; }
    function Qb(a, b, c, d, e, f) { a.info(function () { if (a.a)
        if (f) {
            var h = "";
            for (var m = f.split("&"), l = 0; l < m.length; l++) {
                var t = m[l].split("=");
                if (1 < t.length) {
                    var B = t[0];
                    t = t[1];
                    var z = B.split("_");
                    h = 2 <= z.length && "type" == z[1] ? h + (B + "=" + t + "&") : h + (B + "=redacted&");
                }
            }
        }
        else
            h = null;
    else
        h = f; return "XMLHTTP REQ (" + d + ") [attempt " + e + "]: " + b + "\n" + c + "\n" + h; }); }
    function Rb(a, b, c, d, e, f, h) { a.info(function () { return "XMLHTTP RESP (" + d + ") [ attempt " + e + "]: " + b + "\n" + c + "\n" + f + " " + h; }); }
    function F(a, b, c, d) { a.info(function () { return "XMLHTTP TEXT (" + b + "): " + Sb(a, c) + (d ? " " + d : ""); }); }
    function Tb(a, b) { a.info(function () { return "TIMEOUT: " + b; }); }
    Pb.prototype.info = function () { };
    function Sb(a, b) { if (!a.a)
        return b; if (!b)
        return null; try {
        var c = JSON.parse(b);
        if (c)
            for (a = 0; a < c.length; a++)
                if (Array.isArray(c[a])) {
                    var d = c[a];
                    if (!(2 > d.length)) {
                        var e = d[1];
                        if (Array.isArray(e) && !(1 > e.length)) {
                            var f = e[0];
                            if ("noop" != f && "stop" != f && "close" != f)
                                for (var h = 1; h < e.length; h++)
                                    e[h] = "";
                        }
                    }
                }
        return vb(c);
    }
    catch (m) {
        return b;
    } }
    var Ub = null;
    function Vb() { return Ub = Ub || new D; }
    function Wb(a) { y.call(this, "serverreachability", a); }
    r(Wb, y);
    function G(a) { var b = Vb(); b.dispatchEvent(new Wb(b, a)); }
    function Xb(a) { y.call(this, "statevent", a); }
    r(Xb, y);
    function H(a) { var b = Vb(); b.dispatchEvent(new Xb(b, a)); }
    function Yb(a) { y.call(this, "timingevent", a); }
    r(Yb, y);
    function I(a, b) { if ("function" != ba(a))
        throw Error("Fn must not be null and must be a function"); return k.setTimeout(function () { a(); }, b); }
    var Zb = { NO_ERROR: 0, Za: 1, gb: 2, fb: 3, bb: 4, eb: 5, hb: 6, Da: 7, TIMEOUT: 8, kb: 9 };
    var $b = { ab: "complete", ob: "success", Ea: "error", Da: "abort", mb: "ready", nb: "readystatechange", TIMEOUT: "timeout", ib: "incrementaldata", lb: "progress", cb: "downloadprogress", pb: "uploadprogress" };
    function ac() { }
    ac.prototype.a = null;
    function bc(a) { var b; (b = a.a) || (b = a.a = {}); return b; }
    function cc() { }
    var J = { OPEN: "a", $a: "b", Ea: "c", jb: "d" };
    function dc() { y.call(this, "d"); }
    r(dc, y);
    function ec() { y.call(this, "c"); }
    r(ec, y);
    var fc;
    function gc() { }
    r(gc, ac);
    fc = new gc;
    function K(a, b, c, d) { this.g = a; this.c = b; this.f = c; this.T = d || 1; this.J = new E(this); this.P = hc; a = Ja ? 125 : void 0; this.R = new Hb(a); this.B = null; this.b = !1; this.j = this.l = this.i = this.H = this.u = this.U = this.o = null; this.s = []; this.a = null; this.D = 0; this.h = this.m = null; this.N = -1; this.A = !1; this.O = 0; this.F = null; this.W = this.C = this.V = this.I = !1; }
    var hc = 45E3, ic = {}, jc = {};
    g = K.prototype;
    g.setTimeout = function (a) { this.P = a; };
    function kc(a, b, c) { a.H = 1; a.i = lc(L(b)); a.j = c; a.I = !0; mc(a, null); }
    function mc(a, b) { a.u = q(); M(a); a.l = L(a.i); var c = a.l, d = a.T; Array.isArray(d) || (d = [String(d)]); nc(c.b, "t", d); a.D = 0; a.a = oc(a.g, a.g.C ? b : null); 0 < a.O && (a.F = new Lb(p(a.Ca, a, a.a), a.O)); Nb(a.J, a.a, "readystatechange", a.Wa); b = a.B ? Ba(a.B) : {}; a.j ? (a.m || (a.m = "POST"), b["Content-Type"] = "application/x-www-form-urlencoded", a.a.ba(a.l, a.m, a.j, b)) : (a.m = "GET", a.a.ba(a.l, a.m, null, b)); G(1); Qb(a.c, a.m, a.l, a.f, a.T, a.j); }
    g.Wa = function (a) { a = a.target; var b = this.F; b && 3 == N(a) ? b.f() : this.Ca(a); };
    g.Ca = function (a) {
        try {
            if (a == this.a)
                a: {
                    var b = N(this.a), c = this.a.ua(), d = this.a.X();
                    if (!(3 > b || 3 == b && !Ja && !this.a.$())) {
                        this.A || 4 != b || 7 == c || (8 == c || 0 >= d ? G(3) : G(2));
                        pc(this);
                        var e = this.a.X();
                        this.N = e;
                        var f = this.a.$();
                        this.b = 200 == e;
                        Rb(this.c, this.m, this.l, this.f, this.T, b, e);
                        if (this.b) {
                            if (this.V && !this.C) {
                                b: {
                                    if (this.a) {
                                        var h, m = this.a;
                                        if ((h = m.a ? m.a.getResponseHeader("X-HTTP-Initial-Response") : null) && !ta(h)) {
                                            var l = h;
                                            break b;
                                        }
                                    }
                                    l = null;
                                }
                                if (l)
                                    F(this.c, this.f, l, "Initial handshake response via X-HTTP-Initial-Response"),
                                        this.C = !0, qc(this, l);
                                else {
                                    this.b = !1;
                                    this.h = 3;
                                    H(12);
                                    O(this);
                                    rc(this);
                                    break a;
                                }
                            }
                            this.I ? (tc(this, b, f), Ja && this.b && 3 == b && (Nb(this.J, this.R, "tick", this.Va), this.R.start())) : (F(this.c, this.f, f, null), qc(this, f));
                            4 == b && O(this);
                            this.b && !this.A && (4 == b ? uc(this.g, this) : (this.b = !1, M(this)));
                        }
                        else
                            400 == e && 0 < f.indexOf("Unknown SID") ? (this.h = 3, H(12)) : (this.h = 0, H(13)), O(this), rc(this);
                    }
                }
        }
        catch (t) { }
        finally { }
    };
    function tc(a, b, c) { for (var d = !0; !a.A && a.D < c.length;) {
        var e = vc(a, c);
        if (e == jc) {
            4 == b && (a.h = 4, H(14), d = !1);
            F(a.c, a.f, null, "[Incomplete Response]");
            break;
        }
        else if (e == ic) {
            a.h = 4;
            H(15);
            F(a.c, a.f, c, "[Invalid Chunk]");
            d = !1;
            break;
        }
        else
            F(a.c, a.f, e, null), qc(a, e);
    } 4 == b && 0 == c.length && (a.h = 1, H(16), d = !1); a.b = a.b && d; d ? 0 < c.length && !a.W && (a.W = !0, b = a.g, b.a == a && b.V && !b.F && (b.c.info("Great, no buffering proxy detected. Bytes received: " + c.length), xc(b), b.F = !0)) : (F(a.c, a.f, c, "[Invalid Chunked Response]"), O(a), rc(a)); }
    g.Va = function () { if (this.a) {
        var a = N(this.a), b = this.a.$();
        this.D < b.length && (pc(this), tc(this, a, b), this.b && 4 != a && M(this));
    } };
    function vc(a, b) { var c = a.D, d = b.indexOf("\n", c); if (-1 == d)
        return jc; c = Number(b.substring(c, d)); if (isNaN(c))
        return ic; d += 1; if (d + c > b.length)
        return jc; b = b.substr(d, c); a.D = d + c; return b; }
    g.cancel = function () { this.A = !0; O(this); };
    function M(a) { a.U = q() + a.P; yc(a, a.P); }
    function yc(a, b) { if (null != a.o)
        throw Error("WatchDog timer not null"); a.o = I(p(a.Ua, a), b); }
    function pc(a) { a.o && (k.clearTimeout(a.o), a.o = null); }
    g.Ua = function () { this.o = null; var a = q(); 0 <= a - this.U ? (Tb(this.c, this.l), 2 != this.H && (G(3), H(17)), O(this), this.h = 2, rc(this)) : yc(this, this.U - a); };
    function rc(a) { 0 == a.g.v || a.A || uc(a.g, a); }
    function O(a) { pc(a); var b = a.F; b && "function" == typeof b.ja && b.ja(); a.F = null; Ib(a.R); Ob(a.J); a.a && (b = a.a, a.a = null, b.abort(), b.ja()); }
    function qc(a, b) {
        try {
            var c = a.g;
            if (0 != c.v && (c.a == a || zc(c.b, a)))
                if (c.I = a.N, !a.C && zc(c.b, a) && 3 == c.v) {
                    try {
                        var d = c.ka.a.parse(b);
                    }
                    catch (sc) {
                        d = null;
                    }
                    if (Array.isArray(d) && 3 == d.length) {
                        var e = d;
                        if (0 == e[0])
                            a: {
                                if (!c.j) {
                                    if (c.a)
                                        if (c.a.u + 3E3 < a.u)
                                            Ac(c), Bc(c);
                                        else
                                            break a;
                                    Cc(c);
                                    H(18);
                                }
                            }
                        else
                            c.oa = e[1], 0 < c.oa - c.P && 37500 > e[2] && c.H && 0 == c.o && !c.m && (c.m = I(p(c.Ra, c), 6E3));
                        if (1 >= Dc(c.b) && c.ea) {
                            try {
                                c.ea();
                            }
                            catch (sc) { }
                            c.ea = void 0;
                        }
                    }
                    else
                        P(c, 11);
                }
                else if ((a.C || c.a == a) && Ac(c), !ta(b))
                    for (b = d = c.ka.a.parse(b), d = 0; d < b.length; d++)
                        if (e =
                            b[d], c.P = e[0], e = e[1], 2 == c.v)
                            if ("c" == e[0]) {
                                c.J = e[1];
                                c.ga = e[2];
                                var f = e[3];
                                null != f && (c.ha = f, c.c.info("VER=" + c.ha));
                                var h = e[4];
                                null != h && (c.pa = h, c.c.info("SVER=" + c.pa));
                                var m = e[5];
                                if (null != m && "number" === typeof m && 0 < m) {
                                    var l = 1.5 * m;
                                    c.D = l;
                                    c.c.info("backChannelRequestTimeoutMs_=" + l);
                                }
                                l = c;
                                var t = a.a;
                                if (t) {
                                    var B = t.a ? t.a.getResponseHeader("X-Client-Wire-Protocol") : null;
                                    if (B) {
                                        var z = l.b;
                                        !z.a && (v(B, "spdy") || v(B, "quic") || v(B, "h2")) && (z.f = z.g, z.a = new Set, z.b && (Ec(z, z.b), z.b = null));
                                    }
                                    if (l.A) {
                                        var qb = t.a ? t.a.getResponseHeader("X-HTTP-Session-Id") :
                                            null;
                                        qb && (l.na = qb, Q(l.B, l.A, qb));
                                    }
                                }
                                c.v = 3;
                                c.f && c.f.ta();
                                c.V && (c.N = q() - a.u, c.c.info("Handshake RTT: " + c.N + "ms"));
                                l = c;
                                var va = a;
                                l.la = Fc(l, l.C ? l.ga : null, l.fa);
                                if (va.C) {
                                    Gc(l.b, va);
                                    var wa = va, wc = l.D;
                                    wc && wa.setTimeout(wc);
                                    wa.o && (pc(wa), M(wa));
                                    l.a = va;
                                }
                                else
                                    Hc(l);
                                0 < c.g.length && Ic(c);
                            }
                            else
                                "stop" != e[0] && "close" != e[0] || P(c, 7);
                        else
                            3 == c.v && ("stop" == e[0] || "close" == e[0] ? "stop" == e[0] ? P(c, 7) : Jc(c) : "noop" != e[0] && c.f && c.f.sa(e), c.o = 0);
            G(4);
        }
        catch (sc) { }
    }
    function Kc(a) { if (a.K && "function" == typeof a.K)
        return a.K(); if ("string" === typeof a)
        return a.split(""); if (ca(a)) {
        for (var b = [], c = a.length, d = 0; d < c; d++)
            b.push(a[d]);
        return b;
    } b = []; c = 0; for (d in a)
        b[c++] = a[d]; return a = b; }
    function Lc(a, b) { if (a.forEach && "function" == typeof a.forEach)
        a.forEach(b, void 0);
    else if (ca(a) || "string" === typeof a)
        oa(a, b, void 0);
    else {
        if (a.L && "function" == typeof a.L)
            var c = a.L();
        else if (a.K && "function" == typeof a.K)
            c = void 0;
        else if (ca(a) || "string" === typeof a) {
            c = [];
            for (var d = a.length, e = 0; e < d; e++)
                c.push(e);
        }
        else
            for (e in c = [], d = 0, a)
                c[d++] = e;
        d = Kc(a);
        e = d.length;
        for (var f = 0; f < e; f++)
            b.call(void 0, d[f], c && c[f], a);
    } }
    function R(a, b) { this.b = {}; this.a = []; this.c = 0; var c = arguments.length; if (1 < c) {
        if (c % 2)
            throw Error("Uneven number of arguments");
        for (var d = 0; d < c; d += 2)
            this.set(arguments[d], arguments[d + 1]);
    }
    else if (a)
        if (a instanceof R)
            for (c = a.L(), d = 0; d < c.length; d++)
                this.set(c[d], a.get(c[d]));
        else
            for (d in a)
                this.set(d, a[d]); }
    g = R.prototype;
    g.K = function () { Mc(this); for (var a = [], b = 0; b < this.a.length; b++)
        a.push(this.b[this.a[b]]); return a; };
    g.L = function () { Mc(this); return this.a.concat(); };
    function Mc(a) { if (a.c != a.a.length) {
        for (var b = 0, c = 0; b < a.a.length;) {
            var d = a.a[b];
            S(a.b, d) && (a.a[c++] = d);
            b++;
        }
        a.a.length = c;
    } if (a.c != a.a.length) {
        var e = {};
        for (c = b = 0; b < a.a.length;)
            d = a.a[b], S(e, d) || (a.a[c++] = d, e[d] = 1), b++;
        a.a.length = c;
    } }
    g.get = function (a, b) { return S(this.b, a) ? this.b[a] : b; };
    g.set = function (a, b) { S(this.b, a) || (this.c++, this.a.push(a)); this.b[a] = b; };
    g.forEach = function (a, b) { for (var c = this.L(), d = 0; d < c.length; d++) {
        var e = c[d], f = this.get(e);
        a.call(b, f, e, this);
    } };
    function S(a, b) { return Object.prototype.hasOwnProperty.call(a, b); }
    var Nc = /^(?:([^:/?#.]+):)?(?:\/\/(?:([^\\/?#]*)@)?([^\\/?#]*?)(?::([0-9]+))?(?=[\\/?#]|$))?([^?#]+)?(?:\?([^#]*))?(?:#([\s\S]*))?$/;
    function Oc(a, b) { if (a) {
        a = a.split("&");
        for (var c = 0; c < a.length; c++) {
            var d = a[c].indexOf("="), e = null;
            if (0 <= d) {
                var f = a[c].substring(0, d);
                e = a[c].substring(d + 1);
            }
            else
                f = a[c];
            b(f, e ? decodeURIComponent(e.replace(/\+/g, " ")) : "");
        }
    } }
    function T(a, b) { this.c = this.j = this.f = ""; this.h = null; this.i = this.g = ""; this.a = !1; if (a instanceof T) {
        this.a = void 0 !== b ? b : a.a;
        Pc(this, a.f);
        this.j = a.j;
        Qc(this, a.c);
        Rc(this, a.h);
        this.g = a.g;
        b = a.b;
        var c = new U;
        c.c = b.c;
        b.a && (c.a = new R(b.a), c.b = b.b);
        Sc(this, c);
        this.i = a.i;
    }
    else
        a && (c = String(a).match(Nc)) ? (this.a = !!b, Pc(this, c[1] || "", !0), this.j = Tc(c[2] || ""), Qc(this, c[3] || "", !0), Rc(this, c[4]), this.g = Tc(c[5] || "", !0), Sc(this, c[6] || "", !0), this.i = Tc(c[7] || "")) : (this.a = !!b, this.b = new U(null, this.a)); }
    T.prototype.toString = function () { var a = [], b = this.f; b && a.push(Uc(b, Vc, !0), ":"); var c = this.c; if (c || "file" == b)
        a.push("//"), (b = this.j) && a.push(Uc(b, Vc, !0), "@"), a.push(encodeURIComponent(String(c)).replace(/%25([0-9a-fA-F]{2})/g, "%$1")), c = this.h, null != c && a.push(":", String(c)); if (c = this.g)
        this.c && "/" != c.charAt(0) && a.push("/"), a.push(Uc(c, "/" == c.charAt(0) ? Wc : Xc, !0)); (c = this.b.toString()) && a.push("?", c); (c = this.i) && a.push("#", Uc(c, Yc)); return a.join(""); };
    function L(a) { return new T(a); }
    function Pc(a, b, c) { a.f = c ? Tc(b, !0) : b; a.f && (a.f = a.f.replace(/:$/, "")); }
    function Qc(a, b, c) { a.c = c ? Tc(b, !0) : b; }
    function Rc(a, b) { if (b) {
        b = Number(b);
        if (isNaN(b) || 0 > b)
            throw Error("Bad port number " + b);
        a.h = b;
    }
    else
        a.h = null; }
    function Sc(a, b, c) { b instanceof U ? (a.b = b, Zc(a.b, a.a)) : (c || (b = Uc(b, $c)), a.b = new U(b, a.a)); }
    function Q(a, b, c) { a.b.set(b, c); }
    function lc(a) { Q(a, "zx", Math.floor(2147483648 * Math.random()).toString(36) + Math.abs(Math.floor(2147483648 * Math.random()) ^ q()).toString(36)); return a; }
    function ad(a) { return a instanceof T ? L(a) : new T(a, void 0); }
    function bd(a, b, c, d) { var e = new T(null, void 0); a && Pc(e, a); b && Qc(e, b); c && Rc(e, c); d && (e.g = d); return e; }
    function Tc(a, b) { return a ? b ? decodeURI(a.replace(/%25/g, "%2525")) : decodeURIComponent(a) : ""; }
    function Uc(a, b, c) { return "string" === typeof a ? (a = encodeURI(a).replace(b, cd), c && (a = a.replace(/%25([0-9a-fA-F]{2})/g, "%$1")), a) : null; }
    function cd(a) { a = a.charCodeAt(0); return "%" + (a >> 4 & 15).toString(16) + (a & 15).toString(16); }
    var Vc = /[#\/\?@]/g, Xc = /[#\?:]/g, Wc = /[#\?]/g, $c = /[#\?@]/g, Yc = /#/g;
    function U(a, b) { this.b = this.a = null; this.c = a || null; this.f = !!b; }
    function V(a) { a.a || (a.a = new R, a.b = 0, a.c && Oc(a.c, function (b, c) { a.add(decodeURIComponent(b.replace(/\+/g, " ")), c); })); }
    g = U.prototype;
    g.add = function (a, b) { V(this); this.c = null; a = W(this, a); var c = this.a.get(a); c || this.a.set(a, c = []); c.push(b); this.b += 1; return this; };
    function dd(a, b) { V(a); b = W(a, b); S(a.a.b, b) && (a.c = null, a.b -= a.a.get(b).length, a = a.a, S(a.b, b) && (delete a.b[b], a.c--, a.a.length > 2 * a.c && Mc(a))); }
    function ed(a, b) { V(a); b = W(a, b); return S(a.a.b, b); }
    g.forEach = function (a, b) { V(this); this.a.forEach(function (c, d) { oa(c, function (e) { a.call(b, e, d, this); }, this); }, this); };
    g.L = function () { V(this); for (var a = this.a.K(), b = this.a.L(), c = [], d = 0; d < b.length; d++)
        for (var e = a[d], f = 0; f < e.length; f++)
            c.push(b[d]); return c; };
    g.K = function (a) { V(this); var b = []; if ("string" === typeof a)
        ed(this, a) && (b = ra(b, this.a.get(W(this, a))));
    else {
        a = this.a.K();
        for (var c = 0; c < a.length; c++)
            b = ra(b, a[c]);
    } return b; };
    g.set = function (a, b) { V(this); this.c = null; a = W(this, a); ed(this, a) && (this.b -= this.a.get(a).length); this.a.set(a, [b]); this.b += 1; return this; };
    g.get = function (a, b) { if (!a)
        return b; a = this.K(a); return 0 < a.length ? String(a[0]) : b; };
    function nc(a, b, c) { dd(a, b); 0 < c.length && (a.c = null, a.a.set(W(a, b), sa(c)), a.b += c.length); }
    g.toString = function () { if (this.c)
        return this.c; if (!this.a)
        return ""; for (var a = [], b = this.a.L(), c = 0; c < b.length; c++) {
        var d = b[c], e = encodeURIComponent(String(d));
        d = this.K(d);
        for (var f = 0; f < d.length; f++) {
            var h = e;
            "" !== d[f] && (h += "=" + encodeURIComponent(String(d[f])));
            a.push(h);
        }
    } return this.c = a.join("&"); };
    function W(a, b) { b = String(b); a.f && (b = b.toLowerCase()); return b; }
    function Zc(a, b) { b && !a.f && (V(a), a.c = null, a.a.forEach(function (c, d) { var e = d.toLowerCase(); d != e && (dd(this, d), nc(this, e, c)); }, a)); a.f = b; }
    function fd(a, b) { this.b = a; this.a = b; }
    function gd(a) { this.g = a || hd; k.PerformanceNavigationTiming ? (a = k.performance.getEntriesByType("navigation"), a = 0 < a.length && ("hq" == a[0].nextHopProtocol || "h2" == a[0].nextHopProtocol)) : a = !!(k.ia && k.ia.ya && k.ia.ya() && k.ia.ya().qb); this.f = a ? this.g : 1; this.a = null; 1 < this.f && (this.a = new Set); this.b = null; this.c = []; }
    var hd = 10;
    function id(a) { return a.b ? !0 : a.a ? a.a.size >= a.f : !1; }
    function Dc(a) { return a.b ? 1 : a.a ? a.a.size : 0; }
    function zc(a, b) { return a.b ? a.b == b : a.a ? a.a.has(b) : !1; }
    function Ec(a, b) { a.a ? a.a.add(b) : a.b = b; }
    function Gc(a, b) { a.b && a.b == b ? a.b = null : a.a && a.a.has(b) && a.a.delete(b); }
    gd.prototype.cancel = function () {
        var e_1, _a;
        this.c = jd(this);
        if (this.b)
            this.b.cancel(), this.b = null;
        else if (this.a && 0 !== this.a.size) {
            try {
                for (var _b = __values$1(this.a.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var a = _c.value;
                    a.cancel();
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            this.a.clear();
        }
    };
    function jd(a) {
        var e_2, _a;
        if (null != a.b)
            return a.c.concat(a.b.s);
        if (null != a.a && 0 !== a.a.size) {
            var b = a.c;
            try {
                for (var _b = __values$1(a.a.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var c = _c.value;
                    b = b.concat(c.s);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return b;
        }
        return sa(a.c);
    }
    function kd() { }
    kd.prototype.stringify = function (a) { return k.JSON.stringify(a, void 0); };
    kd.prototype.parse = function (a) { return k.JSON.parse(a, void 0); };
    function ld() { this.a = new kd; }
    function md(a, b, c) { var d = c || ""; try {
        Lc(a, function (e, f) { var h = e; n(e) && (h = vb(e)); b.push(d + f + "=" + encodeURIComponent(h)); });
    }
    catch (e) {
        throw b.push(d + "type=" + encodeURIComponent("_badmap")), e;
    } }
    function nd(a, b) { var c = new Pb; if (k.Image) {
        var d = new Image;
        d.onload = ka(od, c, d, "TestLoadImage: loaded", !0, b);
        d.onerror = ka(od, c, d, "TestLoadImage: error", !1, b);
        d.onabort = ka(od, c, d, "TestLoadImage: abort", !1, b);
        d.ontimeout = ka(od, c, d, "TestLoadImage: timeout", !1, b);
        k.setTimeout(function () { if (d.ontimeout)
            d.ontimeout(); }, 1E4);
        d.src = a;
    }
    else
        b(!1); }
    function od(a, b, c, d, e) { try {
        b.onload = null, b.onerror = null, b.onabort = null, b.ontimeout = null, e(d);
    }
    catch (f) { } }
    var pd = k.JSON.parse;
    function X(a) { D.call(this); this.headers = new R; this.H = a || null; this.b = !1; this.s = this.a = null; this.B = ""; this.h = 0; this.f = ""; this.g = this.A = this.l = this.u = !1; this.o = 0; this.m = null; this.I = qd; this.D = this.F = !1; }
    r(X, D);
    var qd = "", rd = /^https?$/i, sd = ["POST", "PUT"];
    g = X.prototype;
    g.ba = function (a, b, c, d) {
        if (this.a)
            throw Error("[goog.net.XhrIo] Object is active with another request=" + this.B + "; newUri=" + a);
        b = b ? b.toUpperCase() : "GET";
        this.B = a;
        this.f = "";
        this.h = 0;
        this.u = !1;
        this.b = !0;
        this.a = new XMLHttpRequest;
        this.s = this.H ? bc(this.H) : bc(fc);
        this.a.onreadystatechange = p(this.za, this);
        try {
            this.A = !0, this.a.open(b, String(a), !0), this.A = !1;
        }
        catch (f) {
            td(this, f);
            return;
        }
        a = c || "";
        var e = new R(this.headers);
        d && Lc(d, function (f, h) { e.set(h, f); });
        d = pa(e.L());
        c = k.FormData && a instanceof k.FormData;
        !(0 <=
            na(sd, b)) || d || c || e.set("Content-Type", "application/x-www-form-urlencoded;charset=utf-8");
        e.forEach(function (f, h) { this.a.setRequestHeader(h, f); }, this);
        this.I && (this.a.responseType = this.I);
        "withCredentials" in this.a && this.a.withCredentials !== this.F && (this.a.withCredentials = this.F);
        try {
            ud(this), 0 < this.o && ((this.D = vd(this.a)) ? (this.a.timeout = this.o, this.a.ontimeout = p(this.xa, this)) : this.m = Jb(this.xa, this.o, this)), this.l = !0, this.a.send(a), this.l = !1;
        }
        catch (f) {
            td(this, f);
        }
    };
    function vd(a) { return x && Ra(9) && "number" === typeof a.timeout && void 0 !== a.ontimeout; }
    function qa(a) { return "content-type" == a.toLowerCase(); }
    g.xa = function () { "undefined" != typeof goog && this.a && (this.f = "Timed out after " + this.o + "ms, aborting", this.h = 8, this.dispatchEvent("timeout"), this.abort(8)); };
    function td(a, b) { a.b = !1; a.a && (a.g = !0, a.a.abort(), a.g = !1); a.f = b; a.h = 5; wd(a); xd(a); }
    function wd(a) { a.u || (a.u = !0, a.dispatchEvent("complete"), a.dispatchEvent("error")); }
    g.abort = function (a) { this.a && this.b && (this.b = !1, this.g = !0, this.a.abort(), this.g = !1, this.h = a || 7, this.dispatchEvent("complete"), this.dispatchEvent("abort"), xd(this)); };
    g.G = function () { this.a && (this.b && (this.b = !1, this.g = !0, this.a.abort(), this.g = !1), xd(this, !0)); X.S.G.call(this); };
    g.za = function () { this.j || (this.A || this.l || this.g ? yd(this) : this.Ta()); };
    g.Ta = function () { yd(this); };
    function yd(a) {
        if (a.b && "undefined" != typeof goog && (!a.s[1] || 4 != N(a) || 2 != a.X()))
            if (a.l && 4 == N(a))
                Jb(a.za, 0, a);
            else if (a.dispatchEvent("readystatechange"), 4 == N(a)) {
                a.b = !1;
                try {
                    var b = a.X();
                    a: switch (b) {
                        case 200:
                        case 201:
                        case 202:
                        case 204:
                        case 206:
                        case 304:
                        case 1223:
                            var c = !0;
                            break a;
                        default: c = !1;
                    }
                    var d;
                    if (!(d = c)) {
                        var e;
                        if (e = 0 === b) {
                            var f = String(a.B).match(Nc)[1] || null;
                            if (!f && k.self && k.self.location) {
                                var h = k.self.location.protocol;
                                f = h.substr(0, h.length - 1);
                            }
                            e = !rd.test(f ? f.toLowerCase() : "");
                        }
                        d = e;
                    }
                    if (d)
                        a.dispatchEvent("complete"),
                            a.dispatchEvent("success");
                    else {
                        a.h = 6;
                        try {
                            var m = 2 < N(a) ? a.a.statusText : "";
                        }
                        catch (l) {
                            m = "";
                        }
                        a.f = m + " [" + a.X() + "]";
                        wd(a);
                    }
                }
                finally {
                    xd(a);
                }
            }
    }
    function xd(a, b) { if (a.a) {
        ud(a);
        var c = a.a, d = a.s[0] ? aa : null;
        a.a = null;
        a.s = null;
        b || a.dispatchEvent("ready");
        try {
            c.onreadystatechange = d;
        }
        catch (e) { }
    } }
    function ud(a) { a.a && a.D && (a.a.ontimeout = null); a.m && (k.clearTimeout(a.m), a.m = null); }
    function N(a) { return a.a ? a.a.readyState : 0; }
    g.X = function () { try {
        return 2 < N(this) ? this.a.status : -1;
    }
    catch (a) {
        return -1;
    } };
    g.$ = function () { try {
        return this.a ? this.a.responseText : "";
    }
    catch (a) {
        return "";
    } };
    g.Na = function (a) { if (this.a) {
        var b = this.a.responseText;
        a && 0 == b.indexOf(a) && (b = b.substring(a.length));
        return pd(b);
    } };
    g.ua = function () { return this.h; };
    g.Qa = function () { return "string" === typeof this.f ? this.f : String(this.f); };
    function zd(a) { var b = ""; Aa(a, function (c, d) { b += d; b += ":"; b += c; b += "\r\n"; }); return b; }
    function Ad(a, b, c) { a: {
        for (d in c) {
            var d = !1;
            break a;
        }
        d = !0;
    } d || (c = zd(c), "string" === typeof a ? (null != c && encodeURIComponent(String(c))) : Q(a, b, c)); }
    function Bd(a, b, c) { return c && c.internalChannelParams ? c.internalChannelParams[a] || b : b; }
    function Cd(a) {
        this.pa = 0;
        this.g = [];
        this.c = new Pb;
        this.ga = this.la = this.B = this.fa = this.a = this.na = this.A = this.W = this.i = this.O = this.l = null;
        this.La = this.R = 0;
        this.Ia = Bd("failFast", !1, a);
        this.H = this.m = this.j = this.h = this.f = null;
        this.T = !0;
        this.I = this.oa = this.P = -1;
        this.U = this.o = this.u = 0;
        this.Fa = Bd("baseRetryDelayMs", 5E3, a);
        this.Ma = Bd("retryDelaySeedMs", 1E4, a);
        this.Ja = Bd("forwardChannelMaxRetries", 2, a);
        this.ma = Bd("forwardChannelRequestTimeoutMs", 2E4, a);
        this.Ka = a && a.g || void 0;
        this.D = void 0;
        this.C = a && a.supportsCrossDomainXhr ||
            !1;
        this.J = "";
        this.b = new gd(a && a.concurrentRequestLimit);
        this.ka = new ld;
        this.da = a && a.fastHandshake || !1;
        this.Ga = a && a.b || !1;
        a && a.f && (this.c.a = !1);
        a && a.forceLongPolling && (this.T = !1);
        this.V = !this.da && this.T && a && a.c || !1;
        this.ea = void 0;
        this.N = 0;
        this.F = !1;
        this.s = null;
    }
    g = Cd.prototype;
    g.ha = 8;
    g.v = 1;
    function Jc(a) { Dd(a); if (3 == a.v) {
        var b = a.R++, c = L(a.B);
        Q(c, "SID", a.J);
        Q(c, "RID", b);
        Q(c, "TYPE", "terminate");
        Ed(a, c);
        b = new K(a, a.c, b, void 0);
        b.H = 2;
        b.i = lc(L(c));
        c = !1;
        k.navigator && k.navigator.sendBeacon && (c = k.navigator.sendBeacon(b.i.toString(), ""));
        !c && k.Image && ((new Image).src = b.i, c = !0);
        c || (b.a = oc(b.g, null), b.a.ba(b.i));
        b.u = q();
        M(b);
    } Fd(a); }
    function Bc(a) { a.a && (xc(a), a.a.cancel(), a.a = null); }
    function Dd(a) { Bc(a); a.j && (k.clearTimeout(a.j), a.j = null); Ac(a); a.b.cancel(); a.h && ("number" === typeof a.h && k.clearTimeout(a.h), a.h = null); }
    function Gd(a, b) { a.g.push(new fd(a.La++, b)); 3 == a.v && Ic(a); }
    function Ic(a) { id(a.b) || a.h || (a.h = !0, Cb(a.Ba, a), a.u = 0); }
    function Hd(a, b) { if (Dc(a.b) >= a.b.f - (a.h ? 1 : 0))
        return !1; if (a.h)
        return a.g = b.s.concat(a.g), !0; if (1 == a.v || 2 == a.v || a.u >= (a.Ia ? 0 : a.Ja))
        return !1; a.h = I(p(a.Ba, a, b), Id(a, a.u)); a.u++; return !0; }
    g.Ba = function (a) {
        if (this.h)
            if (this.h = null, 1 == this.v) {
                if (!a) {
                    this.R = Math.floor(1E5 * Math.random());
                    a = this.R++;
                    var b = new K(this, this.c, a, void 0), c = this.l;
                    this.O && (c ? (c = Ba(c), Da(c, this.O)) : c = this.O);
                    null === this.i && (b.B = c);
                    var d;
                    if (this.da)
                        a: {
                            for (var e = d = 0; e < this.g.length; e++) {
                                b: {
                                    var f = this.g[e];
                                    if ("__data__" in f.a && (f = f.a.__data__, "string" === typeof f)) {
                                        f = f.length;
                                        break b;
                                    }
                                    f = void 0;
                                }
                                if (void 0 === f)
                                    break;
                                d += f;
                                if (4096 < d) {
                                    d = e;
                                    break a;
                                }
                                if (4096 === d || e === this.g.length - 1) {
                                    d = e + 1;
                                    break a;
                                }
                            }
                            d = 1E3;
                        }
                    else
                        d = 1E3;
                    d = Jd(this, b, d);
                    e = L(this.B);
                    Q(e, "RID", a);
                    Q(e, "CVER", 22);
                    this.A && Q(e, "X-HTTP-Session-Id", this.A);
                    Ed(this, e);
                    this.i && c && Ad(e, this.i, c);
                    Ec(this.b, b);
                    this.Ga && Q(e, "TYPE", "init");
                    this.da ? (Q(e, "$req", d), Q(e, "SID", "null"), b.V = !0, kc(b, e, null)) : kc(b, e, d);
                    this.v = 2;
                }
            }
            else
                3 == this.v && (a ? Kd(this, a) : 0 == this.g.length || id(this.b) || Kd(this));
    };
    function Kd(a, b) { var c; b ? c = b.f : c = a.R++; var d = L(a.B); Q(d, "SID", a.J); Q(d, "RID", c); Q(d, "AID", a.P); Ed(a, d); a.i && a.l && Ad(d, a.i, a.l); c = new K(a, a.c, c, a.u + 1); null === a.i && (c.B = a.l); b && (a.g = b.s.concat(a.g)); b = Jd(a, c, 1E3); c.setTimeout(Math.round(.5 * a.ma) + Math.round(.5 * a.ma * Math.random())); Ec(a.b, c); kc(c, d, b); }
    function Ed(a, b) { a.f && Lc({}, function (c, d) { Q(b, d, c); }); }
    function Jd(a, b, c) { c = Math.min(a.g.length, c); var d = a.f ? p(a.f.Ha, a.f, a) : null; a: for (var e = a.g, f = -1;;) {
        var h = ["count=" + c];
        -1 == f ? 0 < c ? (f = e[0].b, h.push("ofs=" + f)) : f = 0 : h.push("ofs=" + f);
        for (var m = !0, l = 0; l < c; l++) {
            var t = e[l].b, B = e[l].a;
            t -= f;
            if (0 > t)
                f = Math.max(0, e[l].b - 100), m = !1;
            else
                try {
                    md(B, h, "req" + t + "_");
                }
                catch (z) {
                    d && d(B);
                }
        }
        if (m) {
            d = h.join("&");
            break a;
        }
    } a = a.g.splice(0, c); b.s = a; return d; }
    function Hc(a) { a.a || a.j || (a.U = 1, Cb(a.Aa, a), a.o = 0); }
    function Cc(a) { if (a.a || a.j || 3 <= a.o)
        return !1; a.U++; a.j = I(p(a.Aa, a), Id(a, a.o)); a.o++; return !0; }
    g.Aa = function () { this.j = null; Ld(this); if (this.V && !(this.F || null == this.a || 0 >= this.N)) {
        var a = 2 * this.N;
        this.c.info("BP detection timer enabled: " + a);
        this.s = I(p(this.Sa, this), a);
    } };
    g.Sa = function () { this.s && (this.s = null, this.c.info("BP detection timeout reached."), this.c.info("Buffering proxy detected and switch to long-polling!"), this.H = !1, this.F = !0, Bc(this), Ld(this)); };
    function xc(a) { null != a.s && (k.clearTimeout(a.s), a.s = null); }
    function Ld(a) { a.a = new K(a, a.c, "rpc", a.U); null === a.i && (a.a.B = a.l); a.a.O = 0; var b = L(a.la); Q(b, "RID", "rpc"); Q(b, "SID", a.J); Q(b, "CI", a.H ? "0" : "1"); Q(b, "AID", a.P); Ed(a, b); Q(b, "TYPE", "xmlhttp"); a.i && a.l && Ad(b, a.i, a.l); a.D && a.a.setTimeout(a.D); var c = a.a; a = a.ga; c.H = 1; c.i = lc(L(b)); c.j = null; c.I = !0; mc(c, a); }
    g.Ra = function () { null != this.m && (this.m = null, Bc(this), Cc(this), H(19)); };
    function Ac(a) { null != a.m && (k.clearTimeout(a.m), a.m = null); }
    function uc(a, b) { var c = null; if (a.a == b) {
        Ac(a);
        xc(a);
        a.a = null;
        var d = 2;
    }
    else if (zc(a.b, b))
        c = b.s, Gc(a.b, b), d = 1;
    else
        return; a.I = b.N; if (0 != a.v)
        if (b.b)
            if (1 == d) {
                c = b.j ? b.j.length : 0;
                b = q() - b.u;
                var e = a.u;
                d = Vb();
                d.dispatchEvent(new Yb(d, c, b, e));
                Ic(a);
            }
            else
                Hc(a);
        else if (e = b.h, 3 == e || 0 == e && 0 < a.I || !(1 == d && Hd(a, b) || 2 == d && Cc(a)))
            switch (c && 0 < c.length && (b = a.b, b.c = b.c.concat(c)), e) {
                case 1:
                    P(a, 5);
                    break;
                case 4:
                    P(a, 10);
                    break;
                case 3:
                    P(a, 6);
                    break;
                default: P(a, 2);
            } }
    function Id(a, b) { var c = a.Fa + Math.floor(Math.random() * a.Ma); a.f || (c *= 2); return c * b; }
    function P(a, b) { a.c.info("Error code " + b); if (2 == b) {
        var c = null;
        a.f && (c = null);
        var d = p(a.Xa, a);
        c || (c = new T("//www.google.com/images/cleardot.gif"), k.location && "http" == k.location.protocol || Pc(c, "https"), lc(c));
        nd(c.toString(), d);
    }
    else
        H(2); a.v = 0; a.f && a.f.ra(b); Fd(a); Dd(a); }
    g.Xa = function (a) { a ? (this.c.info("Successfully pinged google.com"), H(2)) : (this.c.info("Failed to ping google.com"), H(1)); };
    function Fd(a) { a.v = 0; a.I = -1; if (a.f) {
        if (0 != jd(a.b).length || 0 != a.g.length)
            a.b.c.length = 0, sa(a.g), a.g.length = 0;
        a.f.qa();
    } }
    function Fc(a, b, c) { var d = ad(c); if ("" != d.c)
        b && Qc(d, b + "." + d.c), Rc(d, d.h);
    else {
        var e = k.location;
        d = bd(e.protocol, b ? b + "." + e.hostname : e.hostname, +e.port, c);
    } a.W && Aa(a.W, function (f, h) { Q(d, h, f); }); b = a.A; c = a.na; b && c && Q(d, b, c); Q(d, "VER", a.ha); Ed(a, d); return d; }
    function oc(a, b) { if (b && !a.C)
        throw Error("Can't create secondary domain capable XhrIo object."); b = new X(a.Ka); b.F = a.C; return b; }
    function Md() { }
    g = Md.prototype;
    g.ta = function () { };
    g.sa = function () { };
    g.ra = function () { };
    g.qa = function () { };
    g.Ha = function () { };
    function Nd() { if (x && !(10 <= Number(Ua)))
        throw Error("Environmental error: no available transport."); }
    Nd.prototype.a = function (a, b) { return new Y(a, b); };
    function Y(a, b) {
        D.call(this);
        this.a = new Cd(b);
        this.l = a;
        this.b = b && b.messageUrlParams || null;
        a = b && b.messageHeaders || null;
        b && b.clientProtocolHeaderRequired && (a ? a["X-Client-Protocol"] = "webchannel" : a = { "X-Client-Protocol": "webchannel" });
        this.a.l = a;
        a = b && b.initMessageHeaders || null;
        b && b.messageContentType && (a ? a["X-WebChannel-Content-Type"] = b.messageContentType : a = { "X-WebChannel-Content-Type": b.messageContentType });
        b && b.a && (a ? a["X-WebChannel-Client-Profile"] = b.a : a = { "X-WebChannel-Client-Profile": b.a });
        this.a.O =
            a;
        (a = b && b.httpHeadersOverwriteParam) && !ta(a) && (this.a.i = a);
        this.h = b && b.supportsCrossDomainXhr || !1;
        this.g = b && b.sendRawJson || !1;
        (b = b && b.httpSessionIdParam) && !ta(b) && (this.a.A = b, a = this.b, null !== a && b in a && (a = this.b, b in a && delete a[b]));
        this.f = new Z(this);
    }
    r(Y, D);
    g = Y.prototype;
    g.addEventListener = function (a, b, c, d) { Y.S.addEventListener.call(this, a, b, c, d); };
    g.removeEventListener = function (a, b, c, d) { Y.S.removeEventListener.call(this, a, b, c, d); };
    g.Oa = function () { this.a.f = this.f; this.h && (this.a.C = !0); var a = this.a, b = this.l, c = this.b || void 0; H(0); a.fa = b; a.W = c || {}; a.H = a.T; a.B = Fc(a, null, a.fa); Ic(a); };
    g.close = function () { Jc(this.a); };
    g.Pa = function (a) { if ("string" === typeof a) {
        var b = {};
        b.__data__ = a;
        Gd(this.a, b);
    }
    else
        this.g ? (b = {}, b.__data__ = vb(a), Gd(this.a, b)) : Gd(this.a, a); };
    g.G = function () { this.a.f = null; delete this.f; Jc(this.a); delete this.a; Y.S.G.call(this); };
    function Od(a) { dc.call(this); var b = a.__sm__; if (b) {
        a: {
            for (var c in b) {
                a = c;
                break a;
            }
            a = void 0;
        }
        (this.c = a) ? (a = this.c, this.data = null !== b && a in b ? b[a] : void 0) : this.data = b;
    }
    else
        this.data = a; }
    r(Od, dc);
    function Pd() { ec.call(this); this.status = 1; }
    r(Pd, ec);
    function Z(a) { this.a = a; }
    r(Z, Md);
    Z.prototype.ta = function () { this.a.dispatchEvent("a"); };
    Z.prototype.sa = function (a) { this.a.dispatchEvent(new Od(a)); };
    Z.prototype.ra = function (a) { this.a.dispatchEvent(new Pd(a)); };
    Z.prototype.qa = function () { this.a.dispatchEvent("b"); }; /*

     Copyright 2017 Google Inc.

     Licensed under the Apache License, Version 2.0 (the "License");
     you may not use this file except in compliance with the License.
     You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

     Unless required by applicable law or agreed to in writing, software
     distributed under the License is distributed on an "AS IS" BASIS,
     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     See the License for the specific language governing permissions and
     limitations under the License.
    */
    Nd.prototype.createWebChannel = Nd.prototype.a;
    Y.prototype.send = Y.prototype.Pa;
    Y.prototype.open = Y.prototype.Oa;
    Y.prototype.close = Y.prototype.close;
    Zb.NO_ERROR = 0;
    Zb.TIMEOUT = 8;
    Zb.HTTP_ERROR = 6;
    $b.COMPLETE = "complete";
    cc.EventType = J;
    J.OPEN = "a";
    J.CLOSE = "b";
    J.ERROR = "c";
    J.MESSAGE = "d";
    D.prototype.listen = D.prototype.va;
    X.prototype.listenOnce = X.prototype.wa;
    X.prototype.getLastError = X.prototype.Qa;
    X.prototype.getLastErrorCode = X.prototype.ua;
    X.prototype.getStatus = X.prototype.X;
    X.prototype.getResponseJson = X.prototype.Na;
    X.prototype.getResponseText = X.prototype.$;
    X.prototype.send = X.prototype.ba;
    var esm = { createWebChannelTransport: function () { return new Nd; }, ErrorCode: Zb, EventType: $b, WebChannel: cc, XhrIo: X };

    var index_cjs$4 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
        value: !0
    });

    var t = tslib_es6, e = index_cjs$2, n = index_esm, r = index_cjs, i = esm, o = index_cjs$1;

    function s(t) {
        return t && "object" == typeof t && "default" in t ? t : {
            default: t
        };
    }

    var u =  s(e), a = new n.Logger("@firebase/firestore");

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // Helper methods are needed because variables can't be exported as read/write
    function c() {
        return a.logLevel;
    }

    function h(e) {
        for (var r = [], i = 1; i < arguments.length; i++) r[i - 1] = arguments[i];
        if (a.logLevel <= n.LogLevel.DEBUG) {
            var o = r.map(p);
            a.debug.apply(a, t.__spreadArrays([ "Firestore (7.19.1): " + e ], o));
        }
    }

    function f(e) {
        for (var r = [], i = 1; i < arguments.length; i++) r[i - 1] = arguments[i];
        if (a.logLevel <= n.LogLevel.ERROR) {
            var o = r.map(p);
            a.error.apply(a, t.__spreadArrays([ "Firestore (7.19.1): " + e ], o));
        }
    }

    function l(e) {
        for (var r = [], i = 1; i < arguments.length; i++) r[i - 1] = arguments[i];
        if (a.logLevel <= n.LogLevel.WARN) {
            var o = r.map(p);
            a.warn.apply(a, t.__spreadArrays([ "Firestore (7.19.1): " + e ], o));
        }
    }

    /**
     * Converts an additional log parameter to a string representation.
     */ function p(t) {
        if ("string" == typeof t) return t;
        try {
            return e = t, JSON.stringify(e);
        } catch (e) {
            // Converting to JSON failed, just log the object directly
            return t;
        }
        /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
        /** Formats an object as a JSON string, suitable for logging. */    var e;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Unconditionally fails, throwing an Error with the given message.
     * Messages are stripped in production builds.
     *
     * Returns `never` and can be used in expressions:
     * @example
     * let futureVar = fail('not implemented yet');
     */ function d(t) {
        void 0 === t && (t = "Unexpected state");
        // Log the failure in addition to throw an exception, just in case the
        // exception is swallowed.
            var e = "FIRESTORE (7.19.1) INTERNAL ASSERTION FAILED: " + t;
        // NOTE: We don't use FirestoreError here because these are internal failures
        // that cannot be handled by the user. (Also it would create a circular
        // dependency between the error and assert modules which doesn't work.)
            throw f(e), new Error(e)
        /**
     * Fails if the given assertion condition is false, throwing an Error with the
     * given message if it did.
     *
     * Messages are stripped in production builds.
     */;
    }

    function y(t, e) {
        t || d();
    }

    /**
     * Casts `obj` to `T`. In non-production builds, verifies that `obj` is an
     * instance of `T` before casting.
     */ function v(t, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    e) {
        return t;
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Generates `nBytes` of random bytes.
     *
     * If `nBytes < 0` , an error will be thrown.
     */ function g(t) {
        // Polyfills for IE and WebWorker by using `self` and `msCrypto` when `crypto` is not available.
        var e = 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "undefined" != typeof self && (self.crypto || self.msCrypto), n = new Uint8Array(t);
        if (e && "function" == typeof e.getRandomValues) e.getRandomValues(n); else 
        // Falls back to Math.random
        for (var r = 0; r < t; r++) n[r] = Math.floor(256 * Math.random());
        return n;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ var m = /** @class */ function() {
        function t() {}
        return t.t = function() {
            for (
            // Alphanumeric characters
            var t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", e = Math.floor(256 / t.length) * t.length, n = ""
            // The largest byte value that is a multiple of `char.length`.
            ; n.length < 20; ) for (var r = g(40), i = 0; i < r.length; ++i) 
            // Only accept values that are [0, maxMultiple), this ensures they can
            // be evenly mapped to indices of `chars` via a modulo operation.
            n.length < 20 && r[i] < e && (n += t.charAt(r[i] % t.length));
            return n;
        }, t;
    }();

    function w(t, e) {
        return t < e ? -1 : t > e ? 1 : 0;
    }

    /** Helper to compare arrays using isEqual(). */ function b(t, e, n) {
        return t.length === e.length && t.every((function(t, r) {
            return n(t, e[r]);
        }));
    }

    /**
     * Returns the immediate lexicographically-following string. This is useful to
     * construct an inclusive range for indexeddb iterators.
     */ function _(t) {
        // Return the input string, with an additional NUL byte appended.
        return t + "\0";
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ var I = 
    /**
         * Constructs a DatabaseInfo using the provided host, databaseId and
         * persistenceKey.
         *
         * @param databaseId The database to use.
         * @param persistenceKey A unique identifier for this Firestore's local
         * storage (used in conjunction with the databaseId).
         * @param host The Firestore backend host to connect to.
         * @param ssl Whether to use SSL when connecting.
         * @param forceLongPolling Whether to use the forceLongPolling option
         * when using WebChannel as the network transport.
         */
    function(t, e, n, r, i) {
        this.s = t, this.persistenceKey = e, this.host = n, this.ssl = r, this.forceLongPolling = i;
    }, E = /** @class */ function() {
        function t(t, e) {
            this.projectId = t, this.database = e || "(default)";
        }
        return Object.defineProperty(t.prototype, "i", {
            get: function() {
                return "(default)" === this.database;
            },
            enumerable: !1,
            configurable: !0
        }), t.prototype.isEqual = function(e) {
            return e instanceof t && e.projectId === this.projectId && e.database === this.database;
        }, t.prototype.o = function(t) {
            return w(this.projectId, t.projectId) || w(this.database, t.database);
        }, t;
    }();

    /** The default database name for a project. */
    /** Represents the database ID a Firestore client is associated with. */
    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function T(t) {
        var e = 0;
        for (var n in t) Object.prototype.hasOwnProperty.call(t, n) && e++;
        return e;
    }

    function N(t, e) {
        for (var n in t) Object.prototype.hasOwnProperty.call(t, n) && e(n, t[n]);
    }

    function A(t) {
        for (var e in t) if (Object.prototype.hasOwnProperty.call(t, e)) return !1;
        return !0;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A map implementation that uses objects as keys. Objects must have an
     * associated equals function and must be immutable. Entries in the map are
     * stored together with the key being produced from the mapKeyFn. This map
     * automatically handles collisions of keys.
     */ var S = /** @class */ function() {
        function t(t, e) {
            this.h = t, this.u = e, 
            /**
                 * The inner map for a key -> value pair. Due to the possibility of
                 * collisions we keep a list of entries that we do a linear search through
                 * to find an actual match. Note that collisions should be rare, so we still
                 * expect near constant time lookups in practice.
                 */
            this.l = {}
            /** Get a value for this key, or undefined if it does not exist. */;
        }
        return t.prototype.get = function(t) {
            var e = this.h(t), n = this.l[e];
            if (void 0 !== n) for (var r = 0, i = n; r < i.length; r++) {
                var o = i[r], s = o[0], u = o[1];
                if (this.u(s, t)) return u;
            }
        }, t.prototype.has = function(t) {
            return void 0 !== this.get(t);
        }, 
        /** Put this key and value in the map. */ t.prototype.set = function(t, e) {
            var n = this.h(t), r = this.l[n];
            if (void 0 !== r) {
                for (var i = 0; i < r.length; i++) if (this.u(r[i][0], t)) return void (r[i] = [ t, e ]);
                r.push([ t, e ]);
            } else this.l[n] = [ [ t, e ] ];
        }, 
        /**
         * Remove this key from the map. Returns a boolean if anything was deleted.
         */
        t.prototype.delete = function(t) {
            var e = this.h(t), n = this.l[e];
            if (void 0 === n) return !1;
            for (var r = 0; r < n.length; r++) if (this.u(n[r][0], t)) return 1 === n.length ? delete this.l[e] : n.splice(r, 1), 
            !0;
            return !1;
        }, t.prototype.forEach = function(t) {
            N(this.l, (function(e, n) {
                for (var r = 0, i = n; r < i.length; r++) {
                    var o = i[r], s = o[0], u = o[1];
                    t(s, u);
                }
            }));
        }, t.prototype._ = function() {
            return A(this.l);
        }, t;
    }(), D = {
        // Causes are copied from:
        // https://github.com/grpc/grpc/blob/bceec94ea4fc5f0085d81235d8e1c06798dc341a/include/grpc%2B%2B/impl/codegen/status_code_enum.h
        /** Not an error; returned on success. */
        OK: "ok",
        /** The operation was cancelled (typically by the caller). */
        CANCELLED: "cancelled",
        /** Unknown error or an error from a different error domain. */
        UNKNOWN: "unknown",
        /**
         * Client specified an invalid argument. Note that this differs from
         * FAILED_PRECONDITION. INVALID_ARGUMENT indicates arguments that are
         * problematic regardless of the state of the system (e.g., a malformed file
         * name).
         */
        INVALID_ARGUMENT: "invalid-argument",
        /**
         * Deadline expired before operation could complete. For operations that
         * change the state of the system, this error may be returned even if the
         * operation has completed successfully. For example, a successful response
         * from a server could have been delayed long enough for the deadline to
         * expire.
         */
        DEADLINE_EXCEEDED: "deadline-exceeded",
        /** Some requested entity (e.g., file or directory) was not found. */
        NOT_FOUND: "not-found",
        /**
         * Some entity that we attempted to create (e.g., file or directory) already
         * exists.
         */
        ALREADY_EXISTS: "already-exists",
        /**
         * The caller does not have permission to execute the specified operation.
         * PERMISSION_DENIED must not be used for rejections caused by exhausting
         * some resource (use RESOURCE_EXHAUSTED instead for those errors).
         * PERMISSION_DENIED must not be used if the caller can not be identified
         * (use UNAUTHENTICATED instead for those errors).
         */
        PERMISSION_DENIED: "permission-denied",
        /**
         * The request does not have valid authentication credentials for the
         * operation.
         */
        UNAUTHENTICATED: "unauthenticated",
        /**
         * Some resource has been exhausted, perhaps a per-user quota, or perhaps the
         * entire file system is out of space.
         */
        RESOURCE_EXHAUSTED: "resource-exhausted",
        /**
         * Operation was rejected because the system is not in a state required for
         * the operation's execution. For example, directory to be deleted may be
         * non-empty, an rmdir operation is applied to a non-directory, etc.
         *
         * A litmus test that may help a service implementor in deciding
         * between FAILED_PRECONDITION, ABORTED, and UNAVAILABLE:
         *  (a) Use UNAVAILABLE if the client can retry just the failing call.
         *  (b) Use ABORTED if the client should retry at a higher-level
         *      (e.g., restarting a read-modify-write sequence).
         *  (c) Use FAILED_PRECONDITION if the client should not retry until
         *      the system state has been explicitly fixed. E.g., if an "rmdir"
         *      fails because the directory is non-empty, FAILED_PRECONDITION
         *      should be returned since the client should not retry unless
         *      they have first fixed up the directory by deleting files from it.
         *  (d) Use FAILED_PRECONDITION if the client performs conditional
         *      REST Get/Update/Delete on a resource and the resource on the
         *      server does not match the condition. E.g., conflicting
         *      read-modify-write on the same resource.
         */
        FAILED_PRECONDITION: "failed-precondition",
        /**
         * The operation was aborted, typically due to a concurrency issue like
         * sequencer check failures, transaction aborts, etc.
         *
         * See litmus test above for deciding between FAILED_PRECONDITION, ABORTED,
         * and UNAVAILABLE.
         */
        ABORTED: "aborted",
        /**
         * Operation was attempted past the valid range. E.g., seeking or reading
         * past end of file.
         *
         * Unlike INVALID_ARGUMENT, this error indicates a problem that may be fixed
         * if the system state changes. For example, a 32-bit file system will
         * generate INVALID_ARGUMENT if asked to read at an offset that is not in the
         * range [0,2^32-1], but it will generate OUT_OF_RANGE if asked to read from
         * an offset past the current file size.
         *
         * There is a fair bit of overlap between FAILED_PRECONDITION and
         * OUT_OF_RANGE. We recommend using OUT_OF_RANGE (the more specific error)
         * when it applies so that callers who are iterating through a space can
         * easily look for an OUT_OF_RANGE error to detect when they are done.
         */
        OUT_OF_RANGE: "out-of-range",
        /** Operation is not implemented or not supported/enabled in this service. */
        UNIMPLEMENTED: "unimplemented",
        /**
         * Internal errors. Means some invariants expected by underlying System has
         * been broken. If you see one of these errors, Something is very broken.
         */
        INTERNAL: "internal",
        /**
         * The service is currently unavailable. This is a most likely a transient
         * condition and may be corrected by retrying with a backoff.
         *
         * See litmus test above for deciding between FAILED_PRECONDITION, ABORTED,
         * and UNAVAILABLE.
         */
        UNAVAILABLE: "unavailable",
        /** Unrecoverable data loss or corruption. */
        DATA_LOSS: "data-loss"
    }, x = /** @class */ function(e) {
        function n(t, n) {
            var r = this;
            return (r = e.call(this, n) || this).code = t, r.message = n, r.name = "FirebaseError", 
            // HACK: We write a toString property directly because Error is not a real
            // class and so inheritance does not work correctly. We could alternatively
            // do the same "back-door inheritance" trick that FirebaseError does.
            r.toString = function() {
                return r.name + ": [code=" + r.code + "]: " + r.message;
            }, r;
        }
        return t.__extends(n, e), n;
    }(Error), k = /** @class */ function() {
        function t(t, e) {
            if (this.seconds = t, this.nanoseconds = e, e < 0) throw new x(D.INVALID_ARGUMENT, "Timestamp nanoseconds out of range: " + e);
            if (e >= 1e9) throw new x(D.INVALID_ARGUMENT, "Timestamp nanoseconds out of range: " + e);
            if (t < -62135596800) throw new x(D.INVALID_ARGUMENT, "Timestamp seconds out of range: " + t);
            // This will break in the year 10,000.
                    if (t >= 253402300800) throw new x(D.INVALID_ARGUMENT, "Timestamp seconds out of range: " + t);
        }
        return t.now = function() {
            return t.fromMillis(Date.now());
        }, t.fromDate = function(e) {
            return t.fromMillis(e.getTime());
        }, t.fromMillis = function(e) {
            var n = Math.floor(e / 1e3);
            return new t(n, 1e6 * (e - 1e3 * n));
        }, t.prototype.toDate = function() {
            return new Date(this.toMillis());
        }, t.prototype.toMillis = function() {
            return 1e3 * this.seconds + this.nanoseconds / 1e6;
        }, t.prototype.T = function(t) {
            return this.seconds === t.seconds ? w(this.nanoseconds, t.nanoseconds) : w(this.seconds, t.seconds);
        }, t.prototype.isEqual = function(t) {
            return t.seconds === this.seconds && t.nanoseconds === this.nanoseconds;
        }, t.prototype.toString = function() {
            return "Timestamp(seconds=" + this.seconds + ", nanoseconds=" + this.nanoseconds + ")";
        }, t.prototype.toJSON = function() {
            return {
                seconds: this.seconds,
                nanoseconds: this.nanoseconds
            };
        }, t.prototype.valueOf = function() {
            // This method returns a string of the form <seconds>.<nanoseconds> where <seconds> is
            // translated to have a non-negative value and both <seconds> and <nanoseconds> are left-padded
            // with zeroes to be a consistent length. Strings with this format then have a lexiographical
            // ordering that matches the expected ordering. The <seconds> translation is done to avoid
            // having a leading negative sign (i.e. a leading '-' character) in its string representation,
            // which would affect its lexiographical ordering.
            var t = this.seconds - -62135596800;
            // Note: Up to 12 decimal digits are required to represent all valid 'seconds' values.
                    return String(t).padStart(12, "0") + "." + String(this.nanoseconds).padStart(9, "0");
        }, t;
    }(), L = /** @class */ function() {
        function t(t) {
            this.timestamp = t;
        }
        return t.I = function(e) {
            return new t(e);
        }, t.min = function() {
            return new t(new k(0, 0));
        }, t.prototype.o = function(t) {
            return this.timestamp.T(t.timestamp);
        }, t.prototype.isEqual = function(t) {
            return this.timestamp.isEqual(t.timestamp);
        }, 
        /** Returns a number representation of the version for use in spec tests. */ t.prototype.m = function() {
            // Convert to microseconds.
            return 1e6 * this.timestamp.seconds + this.timestamp.nanoseconds / 1e3;
        }, t.prototype.toString = function() {
            return "SnapshotVersion(" + this.timestamp.toString() + ")";
        }, t.prototype.A = function() {
            return this.timestamp;
        }, t;
    }(), R = /** @class */ function() {
        function t(t, e, n) {
            void 0 === e ? e = 0 : e > t.length && d(), void 0 === n ? n = t.length - e : n > t.length - e && d(), 
            this.segments = t, this.offset = e, this.R = n;
        }
        return Object.defineProperty(t.prototype, "length", {
            get: function() {
                return this.R;
            },
            enumerable: !1,
            configurable: !0
        }), t.prototype.isEqual = function(e) {
            return 0 === t.P(this, e);
        }, t.prototype.child = function(e) {
            var n = this.segments.slice(this.offset, this.limit());
            return e instanceof t ? e.forEach((function(t) {
                n.push(t);
            })) : n.push(e), this.g(n);
        }, 
        /** The index of one past the last segment of the path. */ t.prototype.limit = function() {
            return this.offset + this.length;
        }, t.prototype.V = function(t) {
            return t = void 0 === t ? 1 : t, this.g(this.segments, this.offset + t, this.length - t);
        }, t.prototype.p = function() {
            return this.g(this.segments, this.offset, this.length - 1);
        }, t.prototype.v = function() {
            return this.segments[this.offset];
        }, t.prototype.S = function() {
            return this.get(this.length - 1);
        }, t.prototype.get = function(t) {
            return this.segments[this.offset + t];
        }, t.prototype._ = function() {
            return 0 === this.length;
        }, t.prototype.D = function(t) {
            if (t.length < this.length) return !1;
            for (var e = 0; e < this.length; e++) if (this.get(e) !== t.get(e)) return !1;
            return !0;
        }, t.prototype.C = function(t) {
            if (this.length + 1 !== t.length) return !1;
            for (var e = 0; e < this.length; e++) if (this.get(e) !== t.get(e)) return !1;
            return !0;
        }, t.prototype.forEach = function(t) {
            for (var e = this.offset, n = this.limit(); e < n; e++) t(this.segments[e]);
        }, t.prototype.N = function() {
            return this.segments.slice(this.offset, this.limit());
        }, t.P = function(t, e) {
            for (var n = Math.min(t.length, e.length), r = 0; r < n; r++) {
                var i = t.get(r), o = e.get(r);
                if (i < o) return -1;
                if (i > o) return 1;
            }
            return t.length < e.length ? -1 : t.length > e.length ? 1 : 0;
        }, t;
    }(), P = /** @class */ function(e) {
        function n() {
            return null !== e && e.apply(this, arguments) || this;
        }
        return t.__extends(n, e), n.prototype.g = function(t, e, r) {
            return new n(t, e, r);
        }, n.prototype.F = function() {
            // NOTE: The client is ignorant of any path segments containing escape
            // sequences (e.g. __id123__) and just passes them through raw (they exist
            // for legacy reasons and should not be used frequently).
            return this.N().join("/");
        }, n.prototype.toString = function() {
            return this.F();
        }, 
        /**
         * Creates a resource path from the given slash-delimited string.
         */
        n.k = function(t) {
            // NOTE: The client is ignorant of any path segments containing escape
            // sequences (e.g. __id123__) and just passes them through raw (they exist
            // for legacy reasons and should not be used frequently).
            if (t.indexOf("//") >= 0) throw new x(D.INVALID_ARGUMENT, "Invalid path (" + t + "). Paths must not contain // in them.");
            // We may still have an empty segment at the beginning or end if they had a
            // leading or trailing slash (which we allow).
                    return new n(t.split("/").filter((function(t) {
                return t.length > 0;
            })));
        }, n.$ = function() {
            return new n([]);
        }, n;
    }(R), O = /^[_a-zA-Z][_a-zA-Z0-9]*$/, V = /** @class */ function(e) {
        function n() {
            return null !== e && e.apply(this, arguments) || this;
        }
        return t.__extends(n, e), n.prototype.g = function(t, e, r) {
            return new n(t, e, r);
        }, 
        /**
         * Returns true if the string could be used as a segment in a field path
         * without escaping.
         */
        n.O = function(t) {
            return O.test(t);
        }, n.prototype.F = function() {
            return this.N().map((function(t) {
                return t = t.replace("\\", "\\\\").replace("`", "\\`"), n.O(t) || (t = "`" + t + "`"), 
                t;
            })).join(".");
        }, n.prototype.toString = function() {
            return this.F();
        }, 
        /**
         * Returns true if this field references the key of a document.
         */
        n.prototype.M = function() {
            return 1 === this.length && "__name__" === this.get(0);
        }, 
        /**
         * The field designating the key of a document.
         */
        n.L = function() {
            return new n([ "__name__" ]);
        }, 
        /**
         * Parses a field string from the given server-formatted string.
         *
         * - Splitting the empty string is not allowed (for now at least).
         * - Empty segments within the string (e.g. if there are two consecutive
         *   separators) are not allowed.
         *
         * TODO(b/37244157): we should make this more strict. Right now, it allows
         * non-identifier path components, even if they aren't escaped.
         */
        n.q = function(t) {
            for (var e = [], r = "", i = 0, o = function() {
                if (0 === r.length) throw new x(D.INVALID_ARGUMENT, "Invalid field path (" + t + "). Paths must not be empty, begin with '.', end with '.', or contain '..'");
                e.push(r), r = "";
            }, s = !1; i < t.length; ) {
                var u = t[i];
                if ("\\" === u) {
                    if (i + 1 === t.length) throw new x(D.INVALID_ARGUMENT, "Path has trailing escape character: " + t);
                    var a = t[i + 1];
                    if ("\\" !== a && "." !== a && "`" !== a) throw new x(D.INVALID_ARGUMENT, "Path has invalid escape sequence: " + t);
                    r += a, i += 2;
                } else "`" === u ? (s = !s, i++) : "." !== u || s ? (r += u, i++) : (o(), i++);
            }
            if (o(), s) throw new x(D.INVALID_ARGUMENT, "Unterminated ` in path: " + t);
            return new n(e);
        }, n.$ = function() {
            return new n([]);
        }, n;
    }(R), U = /** @class */ function() {
        function t(t) {
            this.path = t;
        }
        return t.B = function(e) {
            return new t(P.k(e));
        }, t.U = function(e) {
            return new t(P.k(e).V(5));
        }, 
        /** Returns true if the document is in the specified collectionId. */ t.prototype.W = function(t) {
            return this.path.length >= 2 && this.path.get(this.path.length - 2) === t;
        }, t.prototype.isEqual = function(t) {
            return null !== t && 0 === P.P(this.path, t.path);
        }, t.prototype.toString = function() {
            return this.path.toString();
        }, t.P = function(t, e) {
            return P.P(t.path, e.path);
        }, t.j = function(t) {
            return t.length % 2 == 0;
        }, 
        /**
         * Creates and returns a new document key with the given segments.
         *
         * @param segments The segments of the path to the document
         * @return A new instance of DocumentKey
         */
        t.K = function(e) {
            return new t(new P(e.slice()));
        }, t;
    }();

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Returns whether a variable is either undefined or null.
     */
    function C(t) {
        return null == t;
    }

    /** Returns whether the value represents -0. */ function q(t) {
        // Detect if the value is -0.0. Based on polyfill from
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
        return -0 === t && 1 / t == -1 / 0;
    }

    /**
     * Returns whether a value is an integer and in the safe integer range
     * @param value The value to test for being an integer and in the safe range
     */ function M(t) {
        return "number" == typeof t && Number.isInteger(t) && !q(t) && t <= Number.MAX_SAFE_INTEGER && t >= Number.MIN_SAFE_INTEGER;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // Visible for testing
    var F = function(t, e, n, r, i, o, s) {
        void 0 === e && (e = null), void 0 === n && (n = []), void 0 === r && (r = []), 
        void 0 === i && (i = null), void 0 === o && (o = null), void 0 === s && (s = null), 
        this.path = t, this.collectionGroup = e, this.orderBy = n, this.filters = r, this.limit = i, 
        this.startAt = o, this.endAt = s, this.G = null;
    };

    /**
     * Initializes a Target with a path and optional additional query constraints.
     * Path must currently be empty if this is a collection group query.
     *
     * NOTE: you should always construct `Target` from `Query.toTarget` instead of
     * using this factory method, because `Query` provides an implicit `orderBy`
     * property.
     */ function G(t, e, n, r, i, o, s) {
        return void 0 === e && (e = null), void 0 === n && (n = []), void 0 === r && (r = []), 
        void 0 === i && (i = null), void 0 === o && (o = null), void 0 === s && (s = null), 
        new F(t, e, n, r, i, o, s);
    }

    function j(t) {
        var e = v(t);
        if (null === e.G) {
            var n = e.path.F();
            null !== e.collectionGroup && (n += "|cg:" + e.collectionGroup), n += "|f:", n += e.filters.map((function(t) {
                return function(t) {
                    // TODO(b/29183165): Technically, this won't be unique if two values have
                    // the same description, such as the int 3 and the string "3". So we should
                    // add the types in here somehow, too.
                    return t.field.F() + t.op.toString() + Pt(t.value);
                }(t);
            })).join(","), n += "|ob:", n += e.orderBy.map((function(t) {
                return (e = t).field.F() + e.dir;
                var e;
            })).join(","), C(e.limit) || (n += "|l:", n += e.limit), e.startAt && (n += "|lb:", 
            n += Rn(e.startAt)), e.endAt && (n += "|ub:", n += Rn(e.endAt)), e.G = n;
        }
        return e.G;
    }

    function B(t, e) {
        if (t.limit !== e.limit) return !1;
        if (t.orderBy.length !== e.orderBy.length) return !1;
        for (var n = 0; n < t.orderBy.length; n++) if (!Cn(t.orderBy[n], e.orderBy[n])) return !1;
        if (t.filters.length !== e.filters.length) return !1;
        for (var r = 0; r < t.filters.length; r++) if (i = t.filters[r], o = e.filters[r], 
        i.op !== o.op || !i.field.isEqual(o.field) || !xt(i.value, o.value)) return !1;
        var i, o;
        return t.collectionGroup === e.collectionGroup && !!t.path.isEqual(e.path) && !!On(t.startAt, e.startAt) && On(t.endAt, e.endAt);
    }

    function z(t) {
        return U.j(t.path) && null === t.collectionGroup && 0 === t.filters.length;
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /** Converts a Base64 encoded string to a binary string. */
    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Immutable class that represents a "proto" byte string.
     *
     * Proto byte strings can either be Base64-encoded strings or Uint8Arrays when
     * sent on the wire. This class abstracts away this differentiation by holding
     * the proto byte string in a common class that must be converted into a string
     * before being sent as a proto.
     */ var Q = /** @class */ function() {
        function t(t) {
            this.H = t;
        }
        return t.fromBase64String = function(e) {
            return new t(atob(e));
        }, t.fromUint8Array = function(e) {
            return new t(
            /**
     * Helper function to convert an Uint8array to a binary string.
     */
            function(t) {
                for (var e = "", n = 0; n < t.length; ++n) e += String.fromCharCode(t[n]);
                return e;
            }(e));
        }, t.prototype.toBase64 = function() {
            return t = this.H, btoa(t);
            /** Converts a binary string to a Base64 encoded string. */        var t;
            /** True if and only if the Base64 conversion functions are available. */    }, 
        t.prototype.toUint8Array = function() {
            return function(t) {
                for (var e = new Uint8Array(t.length), n = 0; n < t.length; n++) e[n] = t.charCodeAt(n);
                return e;
            }(this.H);
        }, t.prototype.Y = function() {
            return 2 * this.H.length;
        }, t.prototype.o = function(t) {
            return w(this.H, t.H);
        }, t.prototype.isEqual = function(t) {
            return this.H === t.H;
        }, t;
    }();

    Q.J = new Q("");

    var W, H, K = /** @class */ function() {
        function t(
        /** The target being listened to. */
        t, 
        /**
         * The target ID to which the target corresponds; Assigned by the
         * LocalStore for user listens and by the SyncEngine for limbo watches.
         */
        e, 
        /** The purpose of the target. */
        n, 
        /**
         * The sequence number of the last transaction during which this target data
         * was modified.
         */
        r, 
        /** The latest snapshot version seen for this target. */
        i
        /**
         * The maximum snapshot version at which the associated view
         * contained no limbo documents.
         */ , o
        /**
         * An opaque, server-assigned token that allows watching a target to be
         * resumed after disconnecting without retransmitting all the data that
         * matches the target. The resume token essentially identifies a point in
         * time from which the server should resume sending results.
         */ , s) {
            void 0 === i && (i = L.min()), void 0 === o && (o = L.min()), void 0 === s && (s = Q.J), 
            this.target = t, this.targetId = e, this.X = n, this.sequenceNumber = r, this.Z = i, 
            this.lastLimboFreeSnapshotVersion = o, this.resumeToken = s;
        }
        /** Creates a new target data instance with an updated sequence number. */    return t.prototype.tt = function(e) {
            return new t(this.target, this.targetId, this.X, e, this.Z, this.lastLimboFreeSnapshotVersion, this.resumeToken);
        }, 
        /**
         * Creates a new target data instance with an updated resume token and
         * snapshot version.
         */
        t.prototype.et = function(e, n) {
            return new t(this.target, this.targetId, this.X, this.sequenceNumber, n, this.lastLimboFreeSnapshotVersion, e);
        }, 
        /**
         * Creates a new target data instance with an updated last limbo free
         * snapshot version number.
         */
        t.prototype.nt = function(e) {
            return new t(this.target, this.targetId, this.X, this.sequenceNumber, this.Z, e, this.resumeToken);
        }, t;
    }(), Y = 
    // TODO(b/33078163): just use simplest form of existence filter for now
    function(t) {
        this.count = t;
    };

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Determines whether an error code represents a permanent error when received
     * in response to a non-write operation.
     *
     * See isPermanentWriteError for classifying write errors.
     */
    function Z(t) {
        switch (t) {
          case D.OK:
            return d();

          case D.CANCELLED:
          case D.UNKNOWN:
          case D.DEADLINE_EXCEEDED:
          case D.RESOURCE_EXHAUSTED:
          case D.INTERNAL:
          case D.UNAVAILABLE:
     // Unauthenticated means something went wrong with our token and we need
            // to retry with new credentials which will happen automatically.
                  case D.UNAUTHENTICATED:
            return !1;

          case D.INVALID_ARGUMENT:
          case D.NOT_FOUND:
          case D.ALREADY_EXISTS:
          case D.PERMISSION_DENIED:
          case D.FAILED_PRECONDITION:
     // Aborted might be retried in some scenarios, but that is dependant on
            // the context and should handled individually by the calling code.
            // See https://cloud.google.com/apis/design/errors.
                  case D.ABORTED:
          case D.OUT_OF_RANGE:
          case D.UNIMPLEMENTED:
          case D.DATA_LOSS:
            return !0;

          default:
            return d();
        }
    }

    /**
     * Determines whether an error code represents a permanent error when received
     * in response to a write operation.
     *
     * Write operations must be handled specially because as of b/119437764, ABORTED
     * errors on the write stream should be retried too (even though ABORTED errors
     * are not generally retryable).
     *
     * Note that during the initial handshake on the write stream an ABORTED error
     * signals that we should discard our stream token (i.e. it is permanent). This
     * means a handshake error should be classified with isPermanentError, above.
     */
    /**
     * Maps an error Code from GRPC status code number, like 0, 1, or 14. These
     * are not the same as HTTP status codes.
     *
     * @returns The Code equivalent to the given GRPC status code. Fails if there
     *     is no match.
     */ function X(t) {
        if (void 0 === t) 
        // This shouldn't normally happen, but in certain error cases (like trying
        // to send invalid proto messages) we may get an error with no GRPC code.
        return f("GRPC error has no .code"), D.UNKNOWN;
        switch (t) {
          case W.OK:
            return D.OK;

          case W.CANCELLED:
            return D.CANCELLED;

          case W.UNKNOWN:
            return D.UNKNOWN;

          case W.DEADLINE_EXCEEDED:
            return D.DEADLINE_EXCEEDED;

          case W.RESOURCE_EXHAUSTED:
            return D.RESOURCE_EXHAUSTED;

          case W.INTERNAL:
            return D.INTERNAL;

          case W.UNAVAILABLE:
            return D.UNAVAILABLE;

          case W.UNAUTHENTICATED:
            return D.UNAUTHENTICATED;

          case W.INVALID_ARGUMENT:
            return D.INVALID_ARGUMENT;

          case W.NOT_FOUND:
            return D.NOT_FOUND;

          case W.ALREADY_EXISTS:
            return D.ALREADY_EXISTS;

          case W.PERMISSION_DENIED:
            return D.PERMISSION_DENIED;

          case W.FAILED_PRECONDITION:
            return D.FAILED_PRECONDITION;

          case W.ABORTED:
            return D.ABORTED;

          case W.OUT_OF_RANGE:
            return D.OUT_OF_RANGE;

          case W.UNIMPLEMENTED:
            return D.UNIMPLEMENTED;

          case W.DATA_LOSS:
            return D.DATA_LOSS;

          default:
            return d();
        }
    }

    /**
     * Converts an HTTP response's error status to the equivalent error code.
     *
     * @param status An HTTP error response status ("FAILED_PRECONDITION",
     * "UNKNOWN", etc.)
     * @returns The equivalent Code. Non-matching responses are mapped to
     *     Code.UNKNOWN.
     */ (H = W || (W = {}))[H.OK = 0] = "OK", H[H.CANCELLED = 1] = "CANCELLED", H[H.UNKNOWN = 2] = "UNKNOWN", 
    H[H.INVALID_ARGUMENT = 3] = "INVALID_ARGUMENT", H[H.DEADLINE_EXCEEDED = 4] = "DEADLINE_EXCEEDED", 
    H[H.NOT_FOUND = 5] = "NOT_FOUND", H[H.ALREADY_EXISTS = 6] = "ALREADY_EXISTS", H[H.PERMISSION_DENIED = 7] = "PERMISSION_DENIED", 
    H[H.UNAUTHENTICATED = 16] = "UNAUTHENTICATED", H[H.RESOURCE_EXHAUSTED = 8] = "RESOURCE_EXHAUSTED", 
    H[H.FAILED_PRECONDITION = 9] = "FAILED_PRECONDITION", H[H.ABORTED = 10] = "ABORTED", 
    H[H.OUT_OF_RANGE = 11] = "OUT_OF_RANGE", H[H.UNIMPLEMENTED = 12] = "UNIMPLEMENTED", 
    H[H.INTERNAL = 13] = "INTERNAL", H[H.UNAVAILABLE = 14] = "UNAVAILABLE", H[H.DATA_LOSS = 15] = "DATA_LOSS";

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // An immutable sorted map implementation, based on a Left-leaning Red-Black
    // tree.
    var $ = /** @class */ function() {
        function t(t, e) {
            this.P = t, this.root = e || tt.EMPTY;
        }
        // Returns a copy of the map, with the specified key/value added or replaced.
            return t.prototype.st = function(e, n) {
            return new t(this.P, this.root.st(e, n, this.P).copy(null, null, tt.it, null, null));
        }, 
        // Returns a copy of the map, with the specified key removed.
        t.prototype.remove = function(e) {
            return new t(this.P, this.root.remove(e, this.P).copy(null, null, tt.it, null, null));
        }, 
        // Returns the value of the node with the given key, or null.
        t.prototype.get = function(t) {
            for (var e = this.root; !e._(); ) {
                var n = this.P(t, e.key);
                if (0 === n) return e.value;
                n < 0 ? e = e.left : n > 0 && (e = e.right);
            }
            return null;
        }, 
        // Returns the index of the element in this sorted map, or -1 if it doesn't
        // exist.
        t.prototype.indexOf = function(t) {
            for (
            // Number of nodes that were pruned when descending right
            var e = 0, n = this.root; !n._(); ) {
                var r = this.P(t, n.key);
                if (0 === r) return e + n.left.size;
                r < 0 ? n = n.left : (
                // Count all nodes left of the node plus the node itself
                e += n.left.size + 1, n = n.right);
            }
            // Node not found
                    return -1;
        }, t.prototype._ = function() {
            return this.root._();
        }, Object.defineProperty(t.prototype, "size", {
            // Returns the total number of nodes in the map.
            get: function() {
                return this.root.size;
            },
            enumerable: !1,
            configurable: !0
        }), 
        // Returns the minimum key in the map.
        t.prototype.rt = function() {
            return this.root.rt();
        }, 
        // Returns the maximum key in the map.
        t.prototype.ot = function() {
            return this.root.ot();
        }, 
        // Traverses the map in key order and calls the specified action function
        // for each key/value pair. If action returns true, traversal is aborted.
        // Returns the first truthy value returned by action, or the last falsey
        // value returned by action.
        t.prototype.ht = function(t) {
            return this.root.ht(t);
        }, t.prototype.forEach = function(t) {
            this.ht((function(e, n) {
                return t(e, n), !1;
            }));
        }, t.prototype.toString = function() {
            var t = [];
            return this.ht((function(e, n) {
                return t.push(e + ":" + n), !1;
            })), "{" + t.join(", ") + "}";
        }, 
        // Traverses the map in reverse key order and calls the specified action
        // function for each key/value pair. If action returns true, traversal is
        // aborted.
        // Returns the first truthy value returned by action, or the last falsey
        // value returned by action.
        t.prototype.at = function(t) {
            return this.root.at(t);
        }, 
        // Returns an iterator over the SortedMap.
        t.prototype.ut = function() {
            return new J(this.root, null, this.P, !1);
        }, t.prototype.ct = function(t) {
            return new J(this.root, t, this.P, !1);
        }, t.prototype.lt = function() {
            return new J(this.root, null, this.P, !0);
        }, t.prototype._t = function(t) {
            return new J(this.root, t, this.P, !0);
        }, t;
    }(), J = /** @class */ function() {
        function t(t, e, n, r) {
            this.ft = r, this.dt = [];
            for (var i = 1; !t._(); ) if (i = e ? n(t.key, e) : 1, 
            // flip the comparison if we're going in reverse
            r && (i *= -1), i < 0) 
            // This node is less than our start key. ignore it
            t = this.ft ? t.left : t.right; else {
                if (0 === i) {
                    // This node is exactly equal to our start key. Push it on the stack,
                    // but stop iterating;
                    this.dt.push(t);
                    break;
                }
                // This node is greater than our start key, add it to the stack and move
                // to the next one
                            this.dt.push(t), t = this.ft ? t.right : t.left;
            }
        }
        return t.prototype.wt = function() {
            var t = this.dt.pop(), e = {
                key: t.key,
                value: t.value
            };
            if (this.ft) for (t = t.left; !t._(); ) this.dt.push(t), t = t.right; else for (t = t.right; !t._(); ) this.dt.push(t), 
            t = t.left;
            return e;
        }, t.prototype.Tt = function() {
            return this.dt.length > 0;
        }, t.prototype.Et = function() {
            if (0 === this.dt.length) return null;
            var t = this.dt[this.dt.length - 1];
            return {
                key: t.key,
                value: t.value
            };
        }, t;
    }(), tt = /** @class */ function() {
        function t(e, n, r, i, o) {
            this.key = e, this.value = n, this.color = null != r ? r : t.RED, this.left = null != i ? i : t.EMPTY, 
            this.right = null != o ? o : t.EMPTY, this.size = this.left.size + 1 + this.right.size;
        }
        // Returns a copy of the current node, optionally replacing pieces of it.
            return t.prototype.copy = function(e, n, r, i, o) {
            return new t(null != e ? e : this.key, null != n ? n : this.value, null != r ? r : this.color, null != i ? i : this.left, null != o ? o : this.right);
        }, t.prototype._ = function() {
            return !1;
        }, 
        // Traverses the tree in key order and calls the specified action function
        // for each node. If action returns true, traversal is aborted.
        // Returns the first truthy value returned by action, or the last falsey
        // value returned by action.
        t.prototype.ht = function(t) {
            return this.left.ht(t) || t(this.key, this.value) || this.right.ht(t);
        }, 
        // Traverses the tree in reverse key order and calls the specified action
        // function for each node. If action returns true, traversal is aborted.
        // Returns the first truthy value returned by action, or the last falsey
        // value returned by action.
        t.prototype.at = function(t) {
            return this.right.at(t) || t(this.key, this.value) || this.left.at(t);
        }, 
        // Returns the minimum node in the tree.
        t.prototype.min = function() {
            return this.left._() ? this : this.left.min();
        }, 
        // Returns the maximum key in the tree.
        t.prototype.rt = function() {
            return this.min().key;
        }, 
        // Returns the maximum key in the tree.
        t.prototype.ot = function() {
            return this.right._() ? this.key : this.right.ot();
        }, 
        // Returns new tree, with the key/value added.
        t.prototype.st = function(t, e, n) {
            var r = this, i = n(t, r.key);
            return (r = i < 0 ? r.copy(null, null, null, r.left.st(t, e, n), null) : 0 === i ? r.copy(null, e, null, null, null) : r.copy(null, null, null, null, r.right.st(t, e, n))).It();
        }, t.prototype.At = function() {
            if (this.left._()) return t.EMPTY;
            var e = this;
            return e.left.Rt() || e.left.left.Rt() || (e = e.Pt()), (e = e.copy(null, null, null, e.left.At(), null)).It();
        }, 
        // Returns new tree, with the specified item removed.
        t.prototype.remove = function(e, n) {
            var r, i = this;
            if (n(e, i.key) < 0) i.left._() || i.left.Rt() || i.left.left.Rt() || (i = i.Pt()), 
            i = i.copy(null, null, null, i.left.remove(e, n), null); else {
                if (i.left.Rt() && (i = i.gt()), i.right._() || i.right.Rt() || i.right.left.Rt() || (i = i.Vt()), 
                0 === n(e, i.key)) {
                    if (i.right._()) return t.EMPTY;
                    r = i.right.min(), i = i.copy(r.key, r.value, null, null, i.right.At());
                }
                i = i.copy(null, null, null, null, i.right.remove(e, n));
            }
            return i.It();
        }, t.prototype.Rt = function() {
            return this.color;
        }, 
        // Returns new tree after performing any needed rotations.
        t.prototype.It = function() {
            var t = this;
            return t.right.Rt() && !t.left.Rt() && (t = t.yt()), t.left.Rt() && t.left.left.Rt() && (t = t.gt()), 
            t.left.Rt() && t.right.Rt() && (t = t.pt()), t;
        }, t.prototype.Pt = function() {
            var t = this.pt();
            return t.right.left.Rt() && (t = (t = (t = t.copy(null, null, null, null, t.right.gt())).yt()).pt()), 
            t;
        }, t.prototype.Vt = function() {
            var t = this.pt();
            return t.left.left.Rt() && (t = (t = t.gt()).pt()), t;
        }, t.prototype.yt = function() {
            var e = this.copy(null, null, t.RED, null, this.right.left);
            return this.right.copy(null, null, this.color, e, null);
        }, t.prototype.gt = function() {
            var e = this.copy(null, null, t.RED, this.left.right, null);
            return this.left.copy(null, null, this.color, null, e);
        }, t.prototype.pt = function() {
            var t = this.left.copy(null, null, !this.left.color, null, null), e = this.right.copy(null, null, !this.right.color, null, null);
            return this.copy(null, null, !this.color, t, e);
        }, 
        // For testing.
        t.prototype.bt = function() {
            var t = this.vt();
            return Math.pow(2, t) <= this.size + 1;
        }, 
        // In a balanced RB tree, the black-depth (number of black nodes) from root to
        // leaves is equal on both sides.  This function verifies that or asserts.
        t.prototype.vt = function() {
            if (this.Rt() && this.left.Rt()) throw d();
            if (this.right.Rt()) throw d();
            var t = this.left.vt();
            if (t !== this.right.vt()) throw d();
            return t + (this.Rt() ? 0 : 1);
        }, t;
    }();

    // end SortedMap
    // An iterator over an LLRBNode.
    // end LLRBNode
    // Empty node is shared between all LLRB trees.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tt.EMPTY = null, tt.RED = !0, tt.it = !1, 
    // end LLRBEmptyNode
    tt.EMPTY = new (/** @class */ function() {
        function t() {
            this.size = 0;
        }
        return Object.defineProperty(t.prototype, "key", {
            get: function() {
                throw d();
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "value", {
            get: function() {
                throw d();
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "color", {
            get: function() {
                throw d();
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "left", {
            get: function() {
                throw d();
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "right", {
            get: function() {
                throw d();
            },
            enumerable: !1,
            configurable: !0
        }), 
        // Returns a copy of the current node.
        t.prototype.copy = function(t, e, n, r, i) {
            return this;
        }, 
        // Returns a copy of the tree, with the specified key/value added.
        t.prototype.st = function(t, e, n) {
            return new tt(t, e);
        }, 
        // Returns a copy of the tree, with the specified key removed.
        t.prototype.remove = function(t, e) {
            return this;
        }, t.prototype._ = function() {
            return !0;
        }, t.prototype.ht = function(t) {
            return !1;
        }, t.prototype.at = function(t) {
            return !1;
        }, t.prototype.rt = function() {
            return null;
        }, t.prototype.ot = function() {
            return null;
        }, t.prototype.Rt = function() {
            return !1;
        }, 
        // For testing.
        t.prototype.bt = function() {
            return !0;
        }, t.prototype.vt = function() {
            return 0;
        }, t;
    }());

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * SortedSet is an immutable (copy-on-write) collection that holds elements
     * in order specified by the provided comparator.
     *
     * NOTE: if provided comparator returns 0 for two elements, we consider them to
     * be equal!
     */
    var et = /** @class */ function() {
        function t(t) {
            this.P = t, this.data = new $(this.P);
        }
        return t.prototype.has = function(t) {
            return null !== this.data.get(t);
        }, t.prototype.first = function() {
            return this.data.rt();
        }, t.prototype.last = function() {
            return this.data.ot();
        }, Object.defineProperty(t.prototype, "size", {
            get: function() {
                return this.data.size;
            },
            enumerable: !1,
            configurable: !0
        }), t.prototype.indexOf = function(t) {
            return this.data.indexOf(t);
        }, 
        /** Iterates elements in order defined by "comparator" */ t.prototype.forEach = function(t) {
            this.data.ht((function(e, n) {
                return t(e), !1;
            }));
        }, 
        /** Iterates over `elem`s such that: range[0] <= elem < range[1]. */ t.prototype.St = function(t, e) {
            for (var n = this.data.ct(t[0]); n.Tt(); ) {
                var r = n.wt();
                if (this.P(r.key, t[1]) >= 0) return;
                e(r.key);
            }
        }, 
        /**
         * Iterates over `elem`s such that: start <= elem until false is returned.
         */
        t.prototype.Dt = function(t, e) {
            var n;
            for (n = void 0 !== e ? this.data.ct(e) : this.data.ut(); n.Tt(); ) if (!t(n.wt().key)) return;
        }, 
        /** Finds the least element greater than or equal to `elem`. */ t.prototype.Ct = function(t) {
            var e = this.data.ct(t);
            return e.Tt() ? e.wt().key : null;
        }, t.prototype.ut = function() {
            return new nt(this.data.ut());
        }, t.prototype.ct = function(t) {
            return new nt(this.data.ct(t));
        }, 
        /** Inserts or updates an element */ t.prototype.add = function(t) {
            return this.copy(this.data.remove(t).st(t, !0));
        }, 
        /** Deletes an element */ t.prototype.delete = function(t) {
            return this.has(t) ? this.copy(this.data.remove(t)) : this;
        }, t.prototype._ = function() {
            return this.data._();
        }, t.prototype.Nt = function(t) {
            var e = this;
            // Make sure `result` always refers to the larger one of the two sets.
                    return e.size < t.size && (e = t, t = this), t.forEach((function(t) {
                e = e.add(t);
            })), e;
        }, t.prototype.isEqual = function(e) {
            if (!(e instanceof t)) return !1;
            if (this.size !== e.size) return !1;
            for (var n = this.data.ut(), r = e.data.ut(); n.Tt(); ) {
                var i = n.wt().key, o = r.wt().key;
                if (0 !== this.P(i, o)) return !1;
            }
            return !0;
        }, t.prototype.N = function() {
            var t = [];
            return this.forEach((function(e) {
                t.push(e);
            })), t;
        }, t.prototype.toString = function() {
            var t = [];
            return this.forEach((function(e) {
                return t.push(e);
            })), "SortedSet(" + t.toString() + ")";
        }, t.prototype.copy = function(e) {
            var n = new t(this.P);
            return n.data = e, n;
        }, t;
    }(), nt = /** @class */ function() {
        function t(t) {
            this.Ft = t;
        }
        return t.prototype.wt = function() {
            return this.Ft.wt().key;
        }, t.prototype.Tt = function() {
            return this.Ft.Tt();
        }, t;
    }(), rt = new $(U.P);

    function it() {
        return rt;
    }

    function ot() {
        return it();
    }

    var st = new $(U.P);

    function ut() {
        return st;
    }

    var at = new $(U.P), ct = new et(U.P);

    function ht() {
        for (var t = [], e = 0; e < arguments.length; e++) t[e] = arguments[e];
        for (var n = ct, r = 0, i = t; r < i.length; r++) {
            var o = i[r];
            n = n.add(o);
        }
        return n;
    }

    var ft = new et(w);

    function lt() {
        return ft;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * DocumentSet is an immutable (copy-on-write) collection that holds documents
     * in order specified by the provided comparator. We always add a document key
     * comparator on top of what is provided to guarantee document equality based on
     * the key.
     */ var pt = /** @class */ function() {
        /** The default ordering is by key if the comparator is omitted */
        function t(t) {
            // We are adding document key comparator to the end as it's the only
            // guaranteed unique property of a document.
            this.P = t ? function(e, n) {
                return t(e, n) || U.P(e.key, n.key);
            } : function(t, e) {
                return U.P(t.key, e.key);
            }, this.kt = ut(), this.$t = new $(this.P)
            /**
         * Returns an empty copy of the existing DocumentSet, using the same
         * comparator.
         */;
        }
        return t.xt = function(e) {
            return new t(e.P);
        }, t.prototype.has = function(t) {
            return null != this.kt.get(t);
        }, t.prototype.get = function(t) {
            return this.kt.get(t);
        }, t.prototype.first = function() {
            return this.$t.rt();
        }, t.prototype.last = function() {
            return this.$t.ot();
        }, t.prototype._ = function() {
            return this.$t._();
        }, 
        /**
         * Returns the index of the provided key in the document set, or -1 if the
         * document key is not present in the set;
         */
        t.prototype.indexOf = function(t) {
            var e = this.kt.get(t);
            return e ? this.$t.indexOf(e) : -1;
        }, Object.defineProperty(t.prototype, "size", {
            get: function() {
                return this.$t.size;
            },
            enumerable: !1,
            configurable: !0
        }), 
        /** Iterates documents in order defined by "comparator" */ t.prototype.forEach = function(t) {
            this.$t.ht((function(e, n) {
                return t(e), !1;
            }));
        }, 
        /** Inserts or updates a document with the same key */ t.prototype.add = function(t) {
            // First remove the element if we have it.
            var e = this.delete(t.key);
            return e.copy(e.kt.st(t.key, t), e.$t.st(t, null));
        }, 
        /** Deletes a document with a given key */ t.prototype.delete = function(t) {
            var e = this.get(t);
            return e ? this.copy(this.kt.remove(t), this.$t.remove(e)) : this;
        }, t.prototype.isEqual = function(e) {
            if (!(e instanceof t)) return !1;
            if (this.size !== e.size) return !1;
            for (var n = this.$t.ut(), r = e.$t.ut(); n.Tt(); ) {
                var i = n.wt().key, o = r.wt().key;
                if (!i.isEqual(o)) return !1;
            }
            return !0;
        }, t.prototype.toString = function() {
            var t = [];
            return this.forEach((function(e) {
                t.push(e.toString());
            })), 0 === t.length ? "DocumentSet ()" : "DocumentSet (\n  " + t.join("  \n") + "\n)";
        }, t.prototype.copy = function(e, n) {
            var r = new t;
            return r.P = this.P, r.kt = e, r.$t = n, r;
        }, t;
    }(), dt = /** @class */ function() {
        function t() {
            this.Ot = new $(U.P);
        }
        return t.prototype.track = function(t) {
            var e = t.doc.key, n = this.Ot.get(e);
            n ? 
            // Merge the new change with the existing change.
            0 /* Added */ !== t.type && 3 /* Metadata */ === n.type ? this.Ot = this.Ot.st(e, t) : 3 /* Metadata */ === t.type && 1 /* Removed */ !== n.type ? this.Ot = this.Ot.st(e, {
                type: n.type,
                doc: t.doc
            }) : 2 /* Modified */ === t.type && 2 /* Modified */ === n.type ? this.Ot = this.Ot.st(e, {
                type: 2 /* Modified */ ,
                doc: t.doc
            }) : 2 /* Modified */ === t.type && 0 /* Added */ === n.type ? this.Ot = this.Ot.st(e, {
                type: 0 /* Added */ ,
                doc: t.doc
            }) : 1 /* Removed */ === t.type && 0 /* Added */ === n.type ? this.Ot = this.Ot.remove(e) : 1 /* Removed */ === t.type && 2 /* Modified */ === n.type ? this.Ot = this.Ot.st(e, {
                type: 1 /* Removed */ ,
                doc: n.doc
            }) : 0 /* Added */ === t.type && 1 /* Removed */ === n.type ? this.Ot = this.Ot.st(e, {
                type: 2 /* Modified */ ,
                doc: t.doc
            }) : 
            // This includes these cases, which don't make sense:
            // Added->Added
            // Removed->Removed
            // Modified->Added
            // Removed->Modified
            // Metadata->Added
            // Removed->Metadata
            d() : this.Ot = this.Ot.st(e, t);
        }, t.prototype.Mt = function() {
            var t = [];
            return this.Ot.ht((function(e, n) {
                t.push(n);
            })), t;
        }, t;
    }(), yt = /** @class */ function() {
        function t(t, e, n, r, i, o, s, u) {
            this.query = t, this.docs = e, this.Lt = n, this.docChanges = r, this.qt = i, this.fromCache = o, 
            this.Bt = s, this.Ut = u
            /** Returns a view snapshot as if all documents in the snapshot were added. */;
        }
        return t.Qt = function(e, n, r, i) {
            var o = [];
            return n.forEach((function(t) {
                o.push({
                    type: 0 /* Added */ ,
                    doc: t
                });
            })), new t(e, n, pt.xt(n), o, r, i, 
            /* syncStateChanged= */ !0, 
            /* excludesMetadataChanges= */ !1);
        }, Object.defineProperty(t.prototype, "hasPendingWrites", {
            get: function() {
                return !this.qt._();
            },
            enumerable: !1,
            configurable: !0
        }), t.prototype.isEqual = function(t) {
            if (!(this.fromCache === t.fromCache && this.Bt === t.Bt && this.qt.isEqual(t.qt) && gn(this.query, t.query) && this.docs.isEqual(t.docs) && this.Lt.isEqual(t.Lt))) return !1;
            var e = this.docChanges, n = t.docChanges;
            if (e.length !== n.length) return !1;
            for (var r = 0; r < e.length; r++) if (e[r].type !== n[r].type || !e[r].doc.isEqual(n[r].doc)) return !1;
            return !0;
        }, t;
    }(), vt = /** @class */ function() {
        function t(
        /**
         * The snapshot version this event brings us up to, or MIN if not set.
         */
        t, 
        /**
         * A map from target to changes to the target. See TargetChange.
         */
        e, 
        /**
         * A set of targets that is known to be inconsistent. Listens for these
         * targets should be re-established without resume tokens.
         */
        n, 
        /**
         * A set of which documents have changed or been deleted, along with the
         * doc's new values (if not deleted).
         */
        r, 
        /**
         * A set of which document updates are due only to limbo resolution targets.
         */
        i) {
            this.Z = t, this.Wt = e, this.jt = n, this.Kt = r, this.Gt = i;
        }
        /**
         * HACK: Views require RemoteEvents in order to determine whether the view is
         * CURRENT, but secondary tabs don't receive remote events. So this method is
         * used to create a synthesized RemoteEvent that can be used to apply a
         * CURRENT status change to a View, for queries executed in a different tab.
         */
        // PORTING NOTE: Multi-tab only
            return t.zt = function(e, n) {
            var r = new Map;
            return r.set(e, gt.Ht(e, n)), new t(L.min(), r, lt(), it(), ht());
        }, t;
    }(), gt = /** @class */ function() {
        function t(
        /**
         * An opaque, server-assigned token that allows watching a query to be resumed
         * after disconnecting without retransmitting all the data that matches the
         * query. The resume token essentially identifies a point in time from which
         * the server should resume sending results.
         */
        t, 
        /**
         * The "current" (synced) status of this target. Note that "current"
         * has special meaning in the RPC protocol that implies that a target is
         * both up-to-date and consistent with the rest of the watch stream.
         */
        e, 
        /**
         * The set of documents that were newly assigned to this target as part of
         * this remote event.
         */
        n, 
        /**
         * The set of documents that were already assigned to this target but received
         * an update during this remote event.
         */
        r, 
        /**
         * The set of documents that were removed from this target as part of this
         * remote event.
         */
        i) {
            this.resumeToken = t, this.Yt = e, this.Jt = n, this.Xt = r, this.Zt = i
            /**
         * This method is used to create a synthesized TargetChanges that can be used to
         * apply a CURRENT status change to a View (for queries executed in a different
         * tab) or for new queries (to raise snapshots with correct CURRENT status).
         */;
        }
        return t.Ht = function(e, n) {
            return new t(Q.J, n, ht(), ht(), ht());
        }, t;
    }(), mt = function(
    /** The new document applies to all of these targets. */
    t, 
    /** The new document is removed from all of these targets. */
    e, 
    /** The key of the document for this change. */
    n, 
    /**
         * The new document or NoDocument if it was deleted. Is null if the
         * document went out of view without the server sending a new document.
         */
    r) {
        this.te = t, this.removedTargetIds = e, this.key = n, this.ee = r;
    }, wt = function(t, e) {
        this.targetId = t, this.ne = e;
    }, bt = function(
    /** What kind of change occurred to the watch target. */
    t, 
    /** The target IDs that were added/removed/set. */
    e, 
    /**
         * An opaque, server-assigned token that allows watching a target to be
         * resumed after disconnecting without retransmitting all the data that
         * matches the target. The resume token essentially identifies a point in
         * time from which the server should resume sending results.
         */
    n
    /** An RPC error indicating why the watch failed. */ , r) {
        void 0 === n && (n = Q.J), void 0 === r && (r = null), this.state = t, this.targetIds = e, 
        this.resumeToken = n, this.cause = r;
    }, _t = /** @class */ function() {
        function t() {
            /**
             * The number of pending responses (adds or removes) that we are waiting on.
             * We only consider targets active that have no pending responses.
             */
            this.se = 0, 
            /**
                 * Keeps track of the document changes since the last raised snapshot.
                 *
                 * These changes are continuously updated as we receive document updates and
                 * always reflect the current set of changes against the last issued snapshot.
                 */
            this.ie = Tt(), 
            /** See public getters for explanations of these fields. */
            this.re = Q.J, this.oe = !1, 
            /**
                 * Whether this target state should be included in the next snapshot. We
                 * initialize to true so that newly-added targets are included in the next
                 * RemoteEvent.
                 */
            this.he = !0;
        }
        return Object.defineProperty(t.prototype, "Yt", {
            /**
             * Whether this target has been marked 'current'.
             *
             * 'Current' has special meaning in the RPC protocol: It implies that the
             * Watch backend has sent us all changes up to the point at which the target
             * was added and that the target is consistent with the rest of the watch
             * stream.
             */
            get: function() {
                return this.oe;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "resumeToken", {
            /** The last resume token sent to us for this target. */ get: function() {
                return this.re;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "ae", {
            /** Whether this target has pending target adds or target removes. */ get: function() {
                return 0 !== this.se;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "ue", {
            /** Whether we have modified any state that should trigger a snapshot. */ get: function() {
                return this.he;
            },
            enumerable: !1,
            configurable: !0
        }), 
        /**
         * Applies the resume token to the TargetChange, but only when it has a new
         * value. Empty resumeTokens are discarded.
         */
        t.prototype.ce = function(t) {
            t.Y() > 0 && (this.he = !0, this.re = t);
        }, 
        /**
         * Creates a target change from the current set of changes.
         *
         * To reset the document changes after raising this snapshot, call
         * `clearPendingChanges()`.
         */
        t.prototype.le = function() {
            var t = ht(), e = ht(), n = ht();
            return this.ie.forEach((function(r, i) {
                switch (i) {
                  case 0 /* Added */ :
                    t = t.add(r);
                    break;

                  case 2 /* Modified */ :
                    e = e.add(r);
                    break;

                  case 1 /* Removed */ :
                    n = n.add(r);
                    break;

                  default:
                    d();
                }
            })), new gt(this.re, this.oe, t, e, n);
        }, 
        /**
         * Resets the document changes and sets `hasPendingChanges` to false.
         */
        t.prototype._e = function() {
            this.he = !1, this.ie = Tt();
        }, t.prototype.fe = function(t, e) {
            this.he = !0, this.ie = this.ie.st(t, e);
        }, t.prototype.de = function(t) {
            this.he = !0, this.ie = this.ie.remove(t);
        }, t.prototype.we = function() {
            this.se += 1;
        }, t.prototype.Te = function() {
            this.se -= 1;
        }, t.prototype.Ee = function() {
            this.he = !0, this.oe = !0;
        }, t;
    }(), It = /** @class */ function() {
        function t(t) {
            this.Ie = t, 
            /** The internal state of all tracked targets. */
            this.me = new Map, 
            /** Keeps track of the documents to update since the last raised snapshot. */
            this.Ae = it(), 
            /** A mapping of document keys to their set of target IDs. */
            this.Re = Et(), 
            /**
                 * A list of targets with existence filter mismatches. These targets are
                 * known to be inconsistent and their listens needs to be re-established by
                 * RemoteStore.
                 */
            this.Pe = new et(w)
            /**
         * Processes and adds the DocumentWatchChange to the current set of changes.
         */;
        }
        return t.prototype.ge = function(t) {
            for (var e = 0, n = t.te; e < n.length; e++) {
                var r = n[e];
                t.ee instanceof rn ? this.Ve(r, t.ee) : t.ee instanceof on && this.ye(r, t.key, t.ee);
            }
            for (var i = 0, o = t.removedTargetIds; i < o.length; i++) {
                var s = o[i];
                this.ye(s, t.key, t.ee);
            }
        }, 
        /** Processes and adds the WatchTargetChange to the current set of changes. */ t.prototype.pe = function(t) {
            var e = this;
            this.be(t, (function(n) {
                var r = e.ve(n);
                switch (t.state) {
                  case 0 /* NoChange */ :
                    e.Se(n) && r.ce(t.resumeToken);
                    break;

                  case 1 /* Added */ :
                    // We need to decrement the number of pending acks needed from watch
                    // for this targetId.
                    r.Te(), r.ae || 
                    // We have a freshly added target, so we need to reset any state
                    // that we had previously. This can happen e.g. when remove and add
                    // back a target for existence filter mismatches.
                    r._e(), r.ce(t.resumeToken);
                    break;

                  case 2 /* Removed */ :
                    // We need to keep track of removed targets to we can post-filter and
                    // remove any target changes.
                    // We need to decrement the number of pending acks needed from watch
                    // for this targetId.
                    r.Te(), r.ae || e.removeTarget(n);
                    break;

                  case 3 /* Current */ :
                    e.Se(n) && (r.Ee(), r.ce(t.resumeToken));
                    break;

                  case 4 /* Reset */ :
                    e.Se(n) && (
                    // Reset the target and synthesizes removes for all existing
                    // documents. The backend will re-add any documents that still
                    // match the target before it sends the next global snapshot.
                    e.De(n), r.ce(t.resumeToken));
                    break;

                  default:
                    d();
                }
            }));
        }, 
        /**
         * Iterates over all targetIds that the watch change applies to: either the
         * targetIds explicitly listed in the change or the targetIds of all currently
         * active targets.
         */
        t.prototype.be = function(t, e) {
            var n = this;
            t.targetIds.length > 0 ? t.targetIds.forEach(e) : this.me.forEach((function(t, r) {
                n.Se(r) && e(r);
            }));
        }, 
        /**
         * Handles existence filters and synthesizes deletes for filter mismatches.
         * Targets that are invalidated by filter mismatches are added to
         * `pendingTargetResets`.
         */
        t.prototype.Ce = function(t) {
            var e = t.targetId, n = t.ne.count, r = this.Ne(e);
            if (r) {
                var i = r.target;
                if (z(i)) if (0 === n) {
                    // The existence filter told us the document does not exist. We deduce
                    // that this document does not exist and apply a deleted document to
                    // our updates. Without applying this deleted document there might be
                    // another query that will raise this document as part of a snapshot
                    // until it is resolved, essentially exposing inconsistency between
                    // queries.
                    var o = new U(i.path);
                    this.ye(e, o, new on(o, L.min()));
                } else y(1 === n); else this.Fe(e) !== n && (
                // Existence filter mismatch: We reset the mapping and raise a new
                // snapshot with `isFromCache:true`.
                this.De(e), this.Pe = this.Pe.add(e));
            }
        }, 
        /**
         * Converts the currently accumulated state into a remote event at the
         * provided snapshot version. Resets the accumulated changes before returning.
         */
        t.prototype.ke = function(t) {
            var e = this, n = new Map;
            this.me.forEach((function(r, i) {
                var o = e.Ne(i);
                if (o) {
                    if (r.Yt && z(o.target)) {
                        // Document queries for document that don't exist can produce an empty
                        // result set. To update our local cache, we synthesize a document
                        // delete if we have not previously received the document. This
                        // resolves the limbo state of the document, removing it from
                        // limboDocumentRefs.
                        // TODO(dimond): Ideally we would have an explicit lookup target
                        // instead resulting in an explicit delete message and we could
                        // remove this special logic.
                        var s = new U(o.target.path);
                        null !== e.Ae.get(s) || e.$e(i, s) || e.ye(i, s, new on(s, t));
                    }
                    r.ue && (n.set(i, r.le()), r._e());
                }
            }));
            var r = ht();
            // We extract the set of limbo-only document updates as the GC logic
            // special-cases documents that do not appear in the target cache.
            // TODO(gsoltis): Expand on this comment once GC is available in the JS
            // client.
                    this.Re.forEach((function(t, n) {
                var i = !0;
                n.Dt((function(t) {
                    var n = e.Ne(t);
                    return !n || 2 /* LimboResolution */ === n.X || (i = !1, !1);
                })), i && (r = r.add(t));
            }));
            var i = new vt(t, n, this.Pe, this.Ae, r);
            return this.Ae = it(), this.Re = Et(), this.Pe = new et(w), i;
        }, 
        /**
         * Adds the provided document to the internal list of document updates and
         * its document key to the given target's mapping.
         */
        // Visible for testing.
        t.prototype.Ve = function(t, e) {
            if (this.Se(t)) {
                var n = this.$e(t, e.key) ? 2 /* Modified */ : 0 /* Added */;
                this.ve(t).fe(e.key, n), this.Ae = this.Ae.st(e.key, e), this.Re = this.Re.st(e.key, this.xe(e.key).add(t));
            }
        }, 
        /**
         * Removes the provided document from the target mapping. If the
         * document no longer matches the target, but the document's state is still
         * known (e.g. we know that the document was deleted or we received the change
         * that caused the filter mismatch), the new document can be provided
         * to update the remote document cache.
         */
        // Visible for testing.
        t.prototype.ye = function(t, e, n) {
            if (this.Se(t)) {
                var r = this.ve(t);
                this.$e(t, e) ? r.fe(e, 1 /* Removed */) : 
                // The document may have entered and left the target before we raised a
                // snapshot, so we can just ignore the change.
                r.de(e), this.Re = this.Re.st(e, this.xe(e).delete(t)), n && (this.Ae = this.Ae.st(e, n));
            }
        }, t.prototype.removeTarget = function(t) {
            this.me.delete(t);
        }, 
        /**
         * Returns the current count of documents in the target. This includes both
         * the number of documents that the LocalStore considers to be part of the
         * target as well as any accumulated changes.
         */
        t.prototype.Fe = function(t) {
            var e = this.ve(t).le();
            return this.Ie.Oe(t).size + e.Jt.size - e.Zt.size;
        }, 
        /**
         * Increment the number of acks needed from watch before we can consider the
         * server to be 'in-sync' with the client's active targets.
         */
        t.prototype.we = function(t) {
            this.ve(t).we();
        }, t.prototype.ve = function(t) {
            var e = this.me.get(t);
            return e || (e = new _t, this.me.set(t, e)), e;
        }, t.prototype.xe = function(t) {
            var e = this.Re.get(t);
            return e || (e = new et(w), this.Re = this.Re.st(t, e)), e;
        }, 
        /**
         * Verifies that the user is still interested in this target (by calling
         * `getTargetDataForTarget()`) and that we are not waiting for pending ADDs
         * from watch.
         */
        t.prototype.Se = function(t) {
            var e = null !== this.Ne(t);
            return e || h("WatchChangeAggregator", "Detected inactive target", t), e;
        }, 
        /**
         * Returns the TargetData for an active target (i.e. a target that the user
         * is still interested in that has no outstanding target change requests).
         */
        t.prototype.Ne = function(t) {
            var e = this.me.get(t);
            return e && e.ae ? null : this.Ie.Me(t);
        }, 
        /**
         * Resets the state of a Watch target to its initial state (e.g. sets
         * 'current' to false, clears the resume token and removes its target mapping
         * from all documents).
         */
        t.prototype.De = function(t) {
            var e = this;
            this.me.set(t, new _t), this.Ie.Oe(t).forEach((function(n) {
                e.ye(t, n, /*updatedDocument=*/ null);
            }));
        }, 
        /**
         * Returns whether the LocalStore considers the document to be part of the
         * specified target.
         */
        t.prototype.$e = function(t, e) {
            return this.Ie.Oe(t).has(e);
        }, t;
    }();

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * DocumentChangeSet keeps track of a set of changes to docs in a query, merging
     * duplicate events for the same doc.
     */ function Et() {
        return new $(U.P);
    }

    function Tt() {
        return new $(U.P);
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Represents a locally-applied ServerTimestamp.
     *
     * Server Timestamps are backed by MapValues that contain an internal field
     * `__type__` with a value of `server_timestamp`. The previous value and local
     * write time are stored in its `__previous_value__` and `__local_write_time__`
     * fields respectively.
     *
     * Notes:
     * - ServerTimestampValue instances are created as the result of applying a
     *   TransformMutation (see TransformMutation.applyTo()). They can only exist in
     *   the local view of a document. Therefore they do not need to be parsed or
     *   serialized.
     * - When evaluated locally (e.g. for snapshot.data()), they by default
     *   evaluate to `null`. This behavior can be configured by passing custom
     *   FieldValueOptions to value().
     * - With respect to other ServerTimestampValues, they sort by their
     *   localWriteTime.
     */ function Nt(t) {
        var e, n;
        return "server_timestamp" === (null === (n = ((null === (e = null == t ? void 0 : t.mapValue) || void 0 === e ? void 0 : e.fields) || {}).__type__) || void 0 === n ? void 0 : n.stringValue);
    }

    /**
     * Creates a new ServerTimestamp proto value (using the internal format).
     */
    /**
     * Returns the local time at which this timestamp was first set.
     */ function At(t) {
        var e = Ot(t.mapValue.fields.__local_write_time__.timestampValue);
        return new k(e.seconds, e.nanos);
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // A RegExp matching ISO 8601 UTC timestamps with optional fraction.
    var St = new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);

    /** Extracts the backend's type order for the provided value. */ function Dt(t) {
        return "nullValue" in t ? 0 /* NullValue */ : "booleanValue" in t ? 1 /* BooleanValue */ : "integerValue" in t || "doubleValue" in t ? 2 /* NumberValue */ : "timestampValue" in t ? 3 /* TimestampValue */ : "stringValue" in t ? 5 /* StringValue */ : "bytesValue" in t ? 6 /* BlobValue */ : "referenceValue" in t ? 7 /* RefValue */ : "geoPointValue" in t ? 8 /* GeoPointValue */ : "arrayValue" in t ? 9 /* ArrayValue */ : "mapValue" in t ? Nt(t) ? 4 /* ServerTimestampValue */ : 10 /* ObjectValue */ : d();
    }

    /** Tests `left` and `right` for equality based on the backend semantics. */ function xt(t, e) {
        var n = Dt(t);
        if (n !== Dt(e)) return !1;
        switch (n) {
          case 0 /* NullValue */ :
            return !0;

          case 1 /* BooleanValue */ :
            return t.booleanValue === e.booleanValue;

          case 4 /* ServerTimestampValue */ :
            return At(t).isEqual(At(e));

          case 3 /* TimestampValue */ :
            return function(t, e) {
                if ("string" == typeof t.timestampValue && "string" == typeof e.timestampValue && t.timestampValue.length === e.timestampValue.length) 
                // Use string equality for ISO 8601 timestamps
                return t.timestampValue === e.timestampValue;
                var n = Ot(t.timestampValue), r = Ot(e.timestampValue);
                return n.seconds === r.seconds && n.nanos === r.nanos;
            }(t, e);

          case 5 /* StringValue */ :
            return t.stringValue === e.stringValue;

          case 6 /* BlobValue */ :
            return function(t, e) {
                return Ut(t.bytesValue).isEqual(Ut(e.bytesValue));
            }(t, e);

          case 7 /* RefValue */ :
            return t.referenceValue === e.referenceValue;

          case 8 /* GeoPointValue */ :
            return function(t, e) {
                return Vt(t.geoPointValue.latitude) === Vt(e.geoPointValue.latitude) && Vt(t.geoPointValue.longitude) === Vt(e.geoPointValue.longitude);
            }(t, e);

          case 2 /* NumberValue */ :
            return function(t, e) {
                if ("integerValue" in t && "integerValue" in e) return Vt(t.integerValue) === Vt(e.integerValue);
                if ("doubleValue" in t && "doubleValue" in e) {
                    var n = Vt(t.doubleValue), r = Vt(e.doubleValue);
                    return n === r ? q(n) === q(r) : isNaN(n) && isNaN(r);
                }
                return !1;
            }(t, e);

          case 9 /* ArrayValue */ :
            return b(t.arrayValue.values || [], e.arrayValue.values || [], xt);

          case 10 /* ObjectValue */ :
            return function(t, e) {
                var n = t.mapValue.fields || {}, r = e.mapValue.fields || {};
                if (T(n) !== T(r)) return !1;
                for (var i in n) if (n.hasOwnProperty(i) && (void 0 === r[i] || !xt(n[i], r[i]))) return !1;
                return !0;
            }(t, e);

          default:
            return d();
        }
    }

    function kt(t, e) {
        return void 0 !== (t.values || []).find((function(t) {
            return xt(t, e);
        }));
    }

    function Lt(t, e) {
        var n = Dt(t), r = Dt(e);
        if (n !== r) return w(n, r);
        switch (n) {
          case 0 /* NullValue */ :
            return 0;

          case 1 /* BooleanValue */ :
            return w(t.booleanValue, e.booleanValue);

          case 2 /* NumberValue */ :
            return function(t, e) {
                var n = Vt(t.integerValue || t.doubleValue), r = Vt(e.integerValue || e.doubleValue);
                return n < r ? -1 : n > r ? 1 : n === r ? 0 : 
                // one or both are NaN.
                isNaN(n) ? isNaN(r) ? 0 : -1 : 1;
            }(t, e);

          case 3 /* TimestampValue */ :
            return Rt(t.timestampValue, e.timestampValue);

          case 4 /* ServerTimestampValue */ :
            return Rt(At(t), At(e));

          case 5 /* StringValue */ :
            return w(t.stringValue, e.stringValue);

          case 6 /* BlobValue */ :
            return function(t, e) {
                var n = Ut(t), r = Ut(e);
                return n.o(r);
            }(t.bytesValue, e.bytesValue);

          case 7 /* RefValue */ :
            return function(t, e) {
                for (var n = t.split("/"), r = e.split("/"), i = 0; i < n.length && i < r.length; i++) {
                    var o = w(n[i], r[i]);
                    if (0 !== o) return o;
                }
                return w(n.length, r.length);
            }(t.referenceValue, e.referenceValue);

          case 8 /* GeoPointValue */ :
            return function(t, e) {
                var n = w(Vt(t.latitude), Vt(e.latitude));
                return 0 !== n ? n : w(Vt(t.longitude), Vt(e.longitude));
            }(t.geoPointValue, e.geoPointValue);

          case 9 /* ArrayValue */ :
            return function(t, e) {
                for (var n = t.values || [], r = e.values || [], i = 0; i < n.length && i < r.length; ++i) {
                    var o = Lt(n[i], r[i]);
                    if (o) return o;
                }
                return w(n.length, r.length);
            }(t.arrayValue, e.arrayValue);

          case 10 /* ObjectValue */ :
            return function(t, e) {
                var n = t.fields || {}, r = Object.keys(n), i = e.fields || {}, o = Object.keys(i);
                // Even though MapValues are likely sorted correctly based on their insertion
                // order (e.g. when received from the backend), local modifications can bring
                // elements out of order. We need to re-sort the elements to ensure that
                // canonical IDs are independent of insertion order.
                            r.sort(), o.sort();
                for (var s = 0; s < r.length && s < o.length; ++s) {
                    var u = w(r[s], o[s]);
                    if (0 !== u) return u;
                    var a = Lt(n[r[s]], i[o[s]]);
                    if (0 !== a) return a;
                }
                return w(r.length, o.length);
            }(t.mapValue, e.mapValue);

          default:
            throw d();
        }
    }

    function Rt(t, e) {
        if ("string" == typeof t && "string" == typeof e && t.length === e.length) return w(t, e);
        var n = Ot(t), r = Ot(e), i = w(n.seconds, r.seconds);
        return 0 !== i ? i : w(n.nanos, r.nanos);
    }

    function Pt(t) {
        return function t(e) {
            return "nullValue" in e ? "null" : "booleanValue" in e ? "" + e.booleanValue : "integerValue" in e ? "" + e.integerValue : "doubleValue" in e ? "" + e.doubleValue : "timestampValue" in e ? function(t) {
                var e = Ot(t);
                return "time(" + e.seconds + "," + e.nanos + ")";
            }(e.timestampValue) : "stringValue" in e ? e.stringValue : "bytesValue" in e ? Ut(e.bytesValue).toBase64() : "referenceValue" in e ? (r = e.referenceValue, 
            U.U(r).toString()) : "geoPointValue" in e ? "geo(" + (n = e.geoPointValue).latitude + "," + n.longitude + ")" : "arrayValue" in e ? function(e) {
                for (var n = "[", r = !0, i = 0, o = e.values || []; i < o.length; i++) {
                    var s = o[i];
                    r ? r = !1 : n += ",", n += t(s);
                }
                return n + "]";
            }(e.arrayValue) : "mapValue" in e ? function(e) {
                for (
                // Iteration order in JavaScript is not guaranteed. To ensure that we generate
                // matching canonical IDs for identical maps, we need to sort the keys.
                var n = "{", r = !0, i = 0, o = Object.keys(e.fields || {}).sort(); i < o.length; i++) {
                    var s = o[i];
                    r ? r = !1 : n += ",", n += s + ":" + t(e.fields[s]);
                }
                return n + "}";
            }(e.mapValue) : d();
            var n, r;
        }(t);
    }

    function Ot(t) {
        // The json interface (for the browser) will return an iso timestamp string,
        // while the proto js library (for node) will return a
        // google.protobuf.Timestamp instance.
        if (y(!!t), "string" == typeof t) {
            // The date string can have higher precision (nanos) than the Date class
            // (millis), so we do some custom parsing here.
            // Parse the nanos right out of the string.
            var e = 0, n = St.exec(t);
            if (y(!!n), n[1]) {
                // Pad the fraction out to 9 digits (nanos).
                var r = n[1];
                r = (r + "000000000").substr(0, 9), e = Number(r);
            }
            // Parse the date to get the seconds.
                    var i = new Date(t);
            return {
                seconds: Math.floor(i.getTime() / 1e3),
                nanos: e
            };
        }
        return {
            seconds: Vt(t.seconds),
            nanos: Vt(t.nanos)
        };
    }

    /**
     * Converts the possible Proto types for numbers into a JavaScript number.
     * Returns 0 if the value is not numeric.
     */ function Vt(t) {
        // TODO(bjornick): Handle int64 greater than 53 bits.
        return "number" == typeof t ? t : "string" == typeof t ? Number(t) : 0;
    }

    /** Converts the possible Proto types for Blobs into a ByteString. */ function Ut(t) {
        return "string" == typeof t ? Q.fromBase64String(t) : Q.fromUint8Array(t);
    }

    /** Returns a reference value for the provided database and key. */ function Ct(t, e) {
        return {
            referenceValue: "projects/" + t.projectId + "/databases/" + t.database + "/documents/" + e.path.F()
        };
    }

    /** Returns true if `value` is an IntegerValue . */ function qt(t) {
        return !!t && "integerValue" in t;
    }

    /** Returns true if `value` is a DoubleValue. */
    /** Returns true if `value` is an ArrayValue. */ function Mt(t) {
        return !!t && "arrayValue" in t;
    }

    /** Returns true if `value` is a NullValue. */ function Ft(t) {
        return !!t && "nullValue" in t;
    }

    /** Returns true if `value` is NaN. */ function Gt(t) {
        return !!t && "doubleValue" in t && isNaN(Number(t.doubleValue));
    }

    /** Returns true if `value` is a MapValue. */ function jt(t) {
        return !!t && "mapValue" in t;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ var Bt = {
        asc: "ASCENDING",
        desc: "DESCENDING"
    }, zt = {
        "<": "LESS_THAN",
        "<=": "LESS_THAN_OR_EQUAL",
        ">": "GREATER_THAN",
        ">=": "GREATER_THAN_OR_EQUAL",
        "==": "EQUAL",
        "!=": "NOT_EQUAL",
        "array-contains": "ARRAY_CONTAINS",
        in: "IN",
        "not-in": "NOT_IN",
        "array-contains-any": "ARRAY_CONTAINS_ANY"
    }, Qt = function(t, e) {
        this.s = t, this.Le = e;
    };

    /**
     * This class generates JsonObject values for the Datastore API suitable for
     * sending to either GRPC stub methods or via the JSON/HTTP REST API.
     *
     * The serializer supports both Protobuf.js and Proto3 JSON formats. By
     * setting `useProto3Json` to true, the serializer will use the Proto3 JSON
     * format.
     *
     * For a description of the Proto3 JSON format check
     * https://developers.google.com/protocol-buffers/docs/proto3#json
     *
     * TODO(klimt): We can remove the databaseId argument if we keep the full
     * resource name in documents.
     */
    /**
     * Returns an IntegerValue for `value`.
     */
    function Wt(t) {
        return {
            integerValue: "" + t
        };
    }

    /**
     * Returns an DoubleValue for `value` that is encoded based the serializer's
     * `useProto3Json` setting.
     */ function Ht(t, e) {
        if (t.Le) {
            if (isNaN(e)) return {
                doubleValue: "NaN"
            };
            if (e === 1 / 0) return {
                doubleValue: "Infinity"
            };
            if (e === -1 / 0) return {
                doubleValue: "-Infinity"
            };
        }
        return {
            doubleValue: q(e) ? "-0" : e
        };
    }

    /**
     * Returns a value for a number that's appropriate to put into a proto.
     * The return value is an IntegerValue if it can safely represent the value,
     * otherwise a DoubleValue is returned.
     */ function Kt(t, e) {
        return M(e) ? Wt(e) : Ht(t, e);
    }

    /**
     * Returns a value for a Date that's appropriate to put into a proto.
     */ function Yt(t, e) {
        return t.Le ? new Date(1e3 * e.seconds).toISOString().replace(/\.\d*/, "").replace("Z", "") + "." + ("000000000" + e.nanoseconds).slice(-9) + "Z" : {
            seconds: "" + e.seconds,
            nanos: e.nanoseconds
        };
    }

    /**
     * Returns a value for bytes that's appropriate to put in a proto.
     *
     * Visible for testing.
     */ function Zt(t, e) {
        return t.Le ? e.toBase64() : e.toUint8Array();
    }

    /**
     * Returns a ByteString based on the proto string value.
     */ function Xt(t, e) {
        return Yt(t, e.A());
    }

    function $t(t) {
        return y(!!t), L.I(function(t) {
            var e = Ot(t);
            return new k(e.seconds, e.nanos);
        }(t));
    }

    function Jt(t, e) {
        return function(t) {
            return new P([ "projects", t.projectId, "databases", t.database ]);
        }(t).child("documents").child(e).F();
    }

    function te(t) {
        var e = P.k(t);
        return y(_e(e)), e;
    }

    function ee(t, e) {
        return Jt(t.s, e.path);
    }

    function ne(t, e) {
        var n = te(e);
        return y(n.get(1) === t.s.projectId), y(!n.get(3) && !t.s.database || n.get(3) === t.s.database), 
        new U(se(n));
    }

    function re(t, e) {
        return Jt(t.s, e);
    }

    function ie(t) {
        var e = te(t);
        // In v1beta1 queries for collections at the root did not have a trailing
        // "/documents". In v1 all resource paths contain "/documents". Preserve the
        // ability to read the v1beta1 form for compatibility with queries persisted
        // in the local target cache.
            return 4 === e.length ? P.$() : se(e);
    }

    function oe(t) {
        return new P([ "projects", t.s.projectId, "databases", t.s.database ]).F();
    }

    function se(t) {
        return y(t.length > 4 && "documents" === t.get(4)), t.V(5)
        /** Creates a Document proto from key and fields (but no create/update time) */;
    }

    function ue(t, e, n) {
        return {
            name: ee(t, e),
            fields: n.proto.mapValue.fields
        };
    }

    function ae(t, e) {
        var n;
        if (e instanceof Qe) n = {
            update: ue(t, e.key, e.value)
        }; else if (e instanceof Xe) n = {
            delete: ee(t, e.key)
        }; else if (e instanceof We) n = {
            update: ue(t, e.key, e.data),
            updateMask: be(e.qe)
        }; else if (e instanceof Ke) n = {
            transform: {
                document: ee(t, e.key),
                fieldTransforms: e.fieldTransforms.map((function(t) {
                    return function(t, e) {
                        var n = e.transform;
                        if (n instanceof Ae) return {
                            fieldPath: e.field.F(),
                            setToServerValue: "REQUEST_TIME"
                        };
                        if (n instanceof Se) return {
                            fieldPath: e.field.F(),
                            appendMissingElements: {
                                values: n.elements
                            }
                        };
                        if (n instanceof xe) return {
                            fieldPath: e.field.F(),
                            removeAllFromArray: {
                                values: n.elements
                            }
                        };
                        if (n instanceof Le) return {
                            fieldPath: e.field.F(),
                            increment: n.Be
                        };
                        throw d();
                    }(0, t);
                }))
            }
        }; else {
            if (!(e instanceof $e)) return d();
            n = {
                verify: ee(t, e.key)
            };
        }
        return e.Qe.Ue || (n.currentDocument = function(t, e) {
            return void 0 !== e.updateTime ? {
                updateTime: Xt(t, e.updateTime)
            } : void 0 !== e.exists ? {
                exists: e.exists
            } : d();
        }(t, e.Qe)), n;
    }

    function ce(t, e) {
        var n = e.currentDocument ? function(t) {
            return void 0 !== t.updateTime ? Ce.updateTime($t(t.updateTime)) : void 0 !== t.exists ? Ce.exists(t.exists) : Ce.We();
        }(e.currentDocument) : Ce.We();
        if (e.update) {
            e.update.name;
            var r = ne(t, e.update.name), i = new Je({
                mapValue: {
                    fields: e.update.fields
                }
            });
            if (e.updateMask) {
                var o = function(t) {
                    var e = t.fieldPaths || [];
                    return new Oe(e.map((function(t) {
                        return V.q(t);
                    })));
                }(e.updateMask);
                return new We(r, i, o, n);
            }
            return new Qe(r, i, n);
        }
        if (e.delete) {
            var s = ne(t, e.delete);
            return new Xe(s, n);
        }
        if (e.transform) {
            var u = ne(t, e.transform.document), a = e.transform.fieldTransforms.map((function(e) {
                return function(t, e) {
                    var n = null;
                    if ("setToServerValue" in e) y("REQUEST_TIME" === e.setToServerValue), n = new Ae; else if ("appendMissingElements" in e) {
                        var r = e.appendMissingElements.values || [];
                        n = new Se(r);
                    } else if ("removeAllFromArray" in e) {
                        var i = e.removeAllFromArray.values || [];
                        n = new xe(i);
                    } else "increment" in e ? n = new Le(t, e.increment) : d();
                    var o = V.q(e.fieldPath);
                    return new Ve(o, n);
                }(t, e);
            }));
            return y(!0 === n.exists), new Ke(u, a);
        }
        if (e.verify) {
            var c = ne(t, e.verify);
            return new $e(c, n);
        }
        return d();
    }

    function he(t, e) {
        return {
            documents: [ re(t, e.path) ]
        };
    }

    function fe(t, e) {
        // Dissect the path into parent, collectionId, and optional key filter.
        var n = {
            structuredQuery: {}
        }, r = e.path;
        null !== e.collectionGroup ? (n.parent = re(t, r), n.structuredQuery.from = [ {
            collectionId: e.collectionGroup,
            allDescendants: !0
        } ]) : (n.parent = re(t, r.p()), n.structuredQuery.from = [ {
            collectionId: r.S()
        } ]);
        var i = function(t) {
            if (0 !== t.length) {
                var e = t.map((function(t) {
                    // visible for testing
                    return function(t) {
                        if ("==" /* EQUAL */ === t.op) {
                            if (Gt(t.value)) return {
                                unaryFilter: {
                                    field: ve(t.field),
                                    op: "IS_NAN"
                                }
                            };
                            if (Ft(t.value)) return {
                                unaryFilter: {
                                    field: ve(t.field),
                                    op: "IS_NULL"
                                }
                            };
                        } else if ("!=" /* NOT_EQUAL */ === t.op) {
                            if (Gt(t.value)) return {
                                unaryFilter: {
                                    field: ve(t.field),
                                    op: "IS_NOT_NAN"
                                }
                            };
                            if (Ft(t.value)) return {
                                unaryFilter: {
                                    field: ve(t.field),
                                    op: "IS_NOT_NULL"
                                }
                            };
                        }
                        return {
                            fieldFilter: {
                                field: ve(t.field),
                                op: ye(t.op),
                                value: t.value
                            }
                        };
                    }(t);
                }));
                return 1 === e.length ? e[0] : {
                    compositeFilter: {
                        op: "AND",
                        filters: e
                    }
                };
            }
        }(e.filters);
        i && (n.structuredQuery.where = i);
        var o = function(t) {
            if (0 !== t.length) return t.map((function(t) {
                // visible for testing
                return function(t) {
                    return {
                        field: ve(t.field),
                        direction: de(t.dir)
                    };
                }(t);
            }));
        }(e.orderBy);
        o && (n.structuredQuery.orderBy = o);
        var s = function(t, e) {
            return t.Le || C(e) ? e : {
                value: e
            };
        }(t, e.limit);
        return null !== s && (n.structuredQuery.limit = s), e.startAt && (n.structuredQuery.startAt = le(e.startAt)), 
        e.endAt && (n.structuredQuery.endAt = le(e.endAt)), n;
    }

    function le(t) {
        return {
            before: t.before,
            values: t.position
        };
    }

    function pe(t) {
        var e = !!t.before, n = t.values || [];
        return new Ln(n, e);
    }

    // visible for testing
    function de(t) {
        return Bt[t];
    }

    function ye(t) {
        return zt[t];
    }

    function ve(t) {
        return {
            fieldPath: t.F()
        };
    }

    function ge(t) {
        return V.q(t.fieldPath);
    }

    function me(t) {
        return In.create(ge(t.fieldFilter.field), function(t) {
            switch (t) {
              case "EQUAL":
                return "==" /* EQUAL */;

              case "NOT_EQUAL":
                return "!=" /* NOT_EQUAL */;

              case "GREATER_THAN":
                return ">" /* GREATER_THAN */;

              case "GREATER_THAN_OR_EQUAL":
                return ">=" /* GREATER_THAN_OR_EQUAL */;

              case "LESS_THAN":
                return "<" /* LESS_THAN */;

              case "LESS_THAN_OR_EQUAL":
                return "<=" /* LESS_THAN_OR_EQUAL */;

              case "ARRAY_CONTAINS":
                return "array-contains" /* ARRAY_CONTAINS */;

              case "IN":
                return "in" /* IN */;

              case "NOT_IN":
                return "not-in" /* NOT_IN */;

              case "ARRAY_CONTAINS_ANY":
                return "array-contains-any" /* ARRAY_CONTAINS_ANY */;

              case "OPERATOR_UNSPECIFIED":
              default:
                return d();
            }
        }(t.fieldFilter.op), t.fieldFilter.value);
    }

    function we(t) {
        switch (t.unaryFilter.op) {
          case "IS_NAN":
            var e = ge(t.unaryFilter.field);
            return In.create(e, "==" /* EQUAL */ , {
                doubleValue: NaN
            });

          case "IS_NULL":
            var n = ge(t.unaryFilter.field);
            return In.create(n, "==" /* EQUAL */ , {
                nullValue: "NULL_VALUE"
            });

          case "IS_NOT_NAN":
            var r = ge(t.unaryFilter.field);
            return In.create(r, "!=" /* NOT_EQUAL */ , {
                doubleValue: NaN
            });

          case "IS_NOT_NULL":
            var i = ge(t.unaryFilter.field);
            return In.create(i, "!=" /* NOT_EQUAL */ , {
                nullValue: "NULL_VALUE"
            });

          case "OPERATOR_UNSPECIFIED":
          default:
            return d();
        }
    }

    function be(t) {
        var e = [];
        return t.fields.forEach((function(t) {
            return e.push(t.F());
        })), {
            fieldPaths: e
        };
    }

    function _e(t) {
        // Resource names have at least 4 components (project ID, database ID)
        return t.length >= 4 && "projects" === t.get(0) && "databases" === t.get(2);
    }

    /**
     * @license
     * Copyright 2018 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /** Represents a transform within a TransformMutation. */ var Ie = function() {
        // Make sure that the structural type of `TransformOperation` is unique.
        // See https://github.com/microsoft/TypeScript/issues/5451
        this.je = void 0;
    };

    /**
     * Computes the local transform result against the provided `previousValue`,
     * optionally using the provided localWriteTime.
     */ function Ee(t, e, n) {
        return t instanceof Ae ? function(t, e) {
            var n = {
                fields: {
                    __type__: {
                        stringValue: "server_timestamp"
                    },
                    __local_write_time__: {
                        timestampValue: {
                            seconds: t.seconds,
                            nanos: t.nanoseconds
                        }
                    }
                }
            };
            return e && (n.fields.__previous_value__ = e), {
                mapValue: n
            };
        }(n, e) : t instanceof Se ? De(t, e) : t instanceof xe ? ke(t, e) : function(t, e) {
            // PORTING NOTE: Since JavaScript's integer arithmetic is limited to 53 bit
            // precision and resolves overflows by reducing precision, we do not
            // manually cap overflows at 2^63.
            var n = Ne(t, e), r = Re(n) + Re(t.Be);
            return qt(n) && qt(t.Be) ? Wt(r) : Ht(t.serializer, r);
        }(t, e);
    }

    /**
     * Computes a final transform result after the transform has been acknowledged
     * by the server, potentially using the server-provided transformResult.
     */ function Te(t, e, n) {
        // The server just sends null as the transform result for array operations,
        // so we have to calculate a result the same as we do for local
        // applications.
        return t instanceof Se ? De(t, e) : t instanceof xe ? ke(t, e) : n;
    }

    /**
     * If this transform operation is not idempotent, returns the base value to
     * persist for this transform. If a base value is returned, the transform
     * operation is always applied to this base value, even if document has
     * already been updated.
     *
     * Base values provide consistent behavior for non-idempotent transforms and
     * allow us to return the same latency-compensated value even if the backend
     * has already applied the transform operation. The base value is null for
     * idempotent transforms, as they can be re-played even if the backend has
     * already applied them.
     *
     * @return a base value to store along with the mutation, or null for
     * idempotent transforms.
     */ function Ne(t, e) {
        return t instanceof Le ? qt(n = e) || function(t) {
            return !!t && "doubleValue" in t;
        }(n) ? e : {
            integerValue: 0
        } : null;
        var n;
    }

    /** Transforms a value into a server-generated timestamp. */ var Ae = /** @class */ function(e) {
        function n() {
            return null !== e && e.apply(this, arguments) || this;
        }
        return t.__extends(n, e), n;
    }(Ie), Se = /** @class */ function(e) {
        function n(t) {
            var n = this;
            return (n = e.call(this) || this).elements = t, n;
        }
        return t.__extends(n, e), n;
    }(Ie);

    /** Transforms an array value via a union operation. */ function De(t, e) {
        for (var n = Pe(e), r = function(t) {
            n.some((function(e) {
                return xt(e, t);
            })) || n.push(t);
        }, i = 0, o = t.elements; i < o.length; i++) {
            r(o[i]);
        }
        return {
            arrayValue: {
                values: n
            }
        };
    }

    /** Transforms an array value via a remove operation. */ var xe = /** @class */ function(e) {
        function n(t) {
            var n = this;
            return (n = e.call(this) || this).elements = t, n;
        }
        return t.__extends(n, e), n;
    }(Ie);

    function ke(t, e) {
        for (var n = Pe(e), r = function(t) {
            n = n.filter((function(e) {
                return !xt(e, t);
            }));
        }, i = 0, o = t.elements; i < o.length; i++) {
            r(o[i]);
        }
        return {
            arrayValue: {
                values: n
            }
        };
    }

    /**
     * Implements the backend semantics for locally computed NUMERIC_ADD (increment)
     * transforms. Converts all field values to integers or doubles, but unlike the
     * backend does not cap integer values at 2^63. Instead, JavaScript number
     * arithmetic is used and precision loss can occur for values greater than 2^53.
     */ var Le = /** @class */ function(e) {
        function n(t, n) {
            var r = this;
            return (r = e.call(this) || this).serializer = t, r.Be = n, r;
        }
        return t.__extends(n, e), n;
    }(Ie);

    function Re(t) {
        return Vt(t.integerValue || t.doubleValue);
    }

    function Pe(t) {
        return Mt(t) && t.arrayValue.values ? t.arrayValue.values.slice() : [];
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Provides a set of fields that can be used to partially patch a document.
     * FieldMask is used in conjunction with ObjectValue.
     * Examples:
     *   foo - Overwrites foo entirely with the provided value. If foo is not
     *         present in the companion ObjectValue, the field is deleted.
     *   foo.bar - Overwrites only the field bar of the object foo.
     *             If foo is not an object, foo is replaced with an object
     *             containing foo
     */ var Oe = /** @class */ function() {
        function t(t) {
            this.fields = t, 
            // TODO(dimond): validation of FieldMask
            // Sort the field mask to support `FieldMask.isEqual()` and assert below.
            t.sort(V.P)
            /**
         * Verifies that `fieldPath` is included by at least one field in this field
         * mask.
         *
         * This is an O(n) operation, where `n` is the size of the field mask.
         */;
        }
        return t.prototype.Ke = function(t) {
            for (var e = 0, n = this.fields; e < n.length; e++) {
                if (n[e].D(t)) return !0;
            }
            return !1;
        }, t.prototype.isEqual = function(t) {
            return b(this.fields, t.fields, (function(t, e) {
                return t.isEqual(e);
            }));
        }, t;
    }(), Ve = function(t, e) {
        this.field = t, this.transform = e;
    };

    /** A field path and the TransformOperation to perform upon it. */
    /** The result of successfully applying a mutation to the backend. */ var Ue = function(
    /**
         * The version at which the mutation was committed:
         *
         * - For most operations, this is the updateTime in the WriteResult.
         * - For deletes, the commitTime of the WriteResponse (because deletes are
         *   not stored and have no updateTime).
         *
         * Note that these versions can be different: No-op writes will not change
         * the updateTime even though the commitTime advances.
         */
    t, 
    /**
         * The resulting fields returned from the backend after a
         * TransformMutation has been committed. Contains one FieldValue for each
         * FieldTransform that was in the mutation.
         *
         * Will be null if the mutation was not a TransformMutation.
         */
    e) {
        this.version = t, this.transformResults = e;
    }, Ce = /** @class */ function() {
        function t(t, e) {
            this.updateTime = t, this.exists = e
            /** Creates a new empty Precondition. */;
        }
        return t.We = function() {
            return new t;
        }, 
        /** Creates a new Precondition with an exists flag. */ t.exists = function(e) {
            return new t(void 0, e);
        }, 
        /** Creates a new Precondition based on a version a document exists at. */ t.updateTime = function(e) {
            return new t(e);
        }, Object.defineProperty(t.prototype, "Ue", {
            /** Returns whether this Precondition is empty. */ get: function() {
                return void 0 === this.updateTime && void 0 === this.exists;
            },
            enumerable: !1,
            configurable: !0
        }), t.prototype.isEqual = function(t) {
            return this.exists === t.exists && (this.updateTime ? !!t.updateTime && this.updateTime.isEqual(t.updateTime) : !t.updateTime);
        }, t;
    }();

    /**
     * Encodes a precondition for a mutation. This follows the model that the
     * backend accepts with the special case of an explicit "empty" precondition
     * (meaning no precondition).
     */
    /**
     * Returns true if the preconditions is valid for the given document
     * (or null if no document is available).
     */
    function qe(t, e) {
        return void 0 !== t.updateTime ? e instanceof rn && e.version.isEqual(t.updateTime) : void 0 === t.exists || t.exists === e instanceof rn;
    }

    /**
     * A mutation describes a self-contained change to a document. Mutations can
     * create, replace, delete, and update subsets of documents.
     *
     * Mutations not only act on the value of the document but also its version.
     *
     * For local mutations (mutations that haven't been committed yet), we preserve
     * the existing version for Set, Patch, and Transform mutations. For Delete
     * mutations, we reset the version to 0.
     *
     * Here's the expected transition table.
     *
     * MUTATION           APPLIED TO            RESULTS IN
     *
     * SetMutation        Document(v3)          Document(v3)
     * SetMutation        NoDocument(v3)        Document(v0)
     * SetMutation        null                  Document(v0)
     * PatchMutation      Document(v3)          Document(v3)
     * PatchMutation      NoDocument(v3)        NoDocument(v3)
     * PatchMutation      null                  null
     * TransformMutation  Document(v3)          Document(v3)
     * TransformMutation  NoDocument(v3)        NoDocument(v3)
     * TransformMutation  null                  null
     * DeleteMutation     Document(v3)          NoDocument(v0)
     * DeleteMutation     NoDocument(v3)        NoDocument(v0)
     * DeleteMutation     null                  NoDocument(v0)
     *
     * For acknowledged mutations, we use the updateTime of the WriteResponse as
     * the resulting version for Set, Patch, and Transform mutations. As deletes
     * have no explicit update time, we use the commitTime of the WriteResponse for
     * Delete mutations.
     *
     * If a mutation is acknowledged by the backend but fails the precondition check
     * locally, we return an `UnknownDocument` and rely on Watch to send us the
     * updated version.
     *
     * Note that TransformMutations don't create Documents (in the case of being
     * applied to a NoDocument), even though they would on the backend. This is
     * because the client always combines the TransformMutation with a SetMutation
     * or PatchMutation and we only want to apply the transform if the prior
     * mutation resulted in a Document (always true for a SetMutation, but not
     * necessarily for a PatchMutation).
     *
     * ## Subclassing Notes
     *
     * Subclasses of Mutation need to implement applyToRemoteDocument() and
     * applyToLocalView() to implement the actual behavior of applying the mutation
     * to some source document.
     */ var Me = function() {};

    /**
     * Applies this mutation to the given MaybeDocument or null for the purposes
     * of computing a new remote document. If the input document doesn't match the
     * expected state (e.g. it is null or outdated), an `UnknownDocument` can be
     * returned.
     *
     * @param mutation The mutation to apply.
     * @param maybeDoc The document to mutate. The input document can be null if
     *     the client has no knowledge of the pre-mutation state of the document.
     * @param mutationResult The result of applying the mutation from the backend.
     * @return The mutated document. The returned document may be an
     *     UnknownDocument if the mutation could not be applied to the locally
     *     cached base document.
     */ function Fe(t, e, n) {
        return t instanceof Qe ? function(t, e, n) {
            // Unlike applySetMutationToLocalView, if we're applying a mutation to a
            // remote document the server has accepted the mutation so the precondition
            // must have held.
            return new rn(t.key, n.version, t.value, {
                hasCommittedMutations: !0
            });
        }(t, 0, n) : t instanceof We ? function(t, e, n) {
            if (!qe(t.Qe, e)) 
            // Since the mutation was not rejected, we know that the  precondition
            // matched on the backend. We therefore must not have the expected version
            // of the document in our cache and return an UnknownDocument with the
            // known updateTime.
            return new sn(t.key, n.version);
            var r = He(t, e);
            return new rn(t.key, n.version, r, {
                hasCommittedMutations: !0
            });
        }(t, e, n) : t instanceof Ke ? function(t, e, n) {
            if (y(null != n.transformResults), !qe(t.Qe, e)) 
            // Since the mutation was not rejected, we know that the  precondition
            // matched on the backend. We therefore must not have the expected version
            // of the document in our cache and return an UnknownDocument with the
            // known updateTime.
            return new sn(t.key, n.version);
            var r = Ye(t, e), i = 
            /**
     * Creates a list of "transform results" (a transform result is a field value
     * representing the result of applying a transform) for use after a
     * TransformMutation has been acknowledged by the server.
     *
     * @param fieldTransforms The field transforms to apply the result to.
     * @param baseDoc The document prior to applying this mutation batch.
     * @param serverTransformResults The transform results received by the server.
     * @return The transform results list.
     */
            function(t, e, n) {
                var r = [];
                y(t.length === n.length);
                for (var i = 0; i < n.length; i++) {
                    var o = t[i], s = o.transform, u = null;
                    e instanceof rn && (u = e.field(o.field)), r.push(Te(s, u, n[i]));
                }
                return r;
            }(t.fieldTransforms, e, n.transformResults), o = n.version, s = Ze(t, r.data(), i);
            return new rn(t.key, o, s, {
                hasCommittedMutations: !0
            });
        }(t, e, n) : function(t, e, n) {
            // Unlike applyToLocalView, if we're applying a mutation to a remote
            // document the server has accepted the mutation so the precondition must
            // have held.
            return new on(t.key, n.version, {
                hasCommittedMutations: !0
            });
        }(t, 0, n);
    }

    /**
     * Applies this mutation to the given MaybeDocument or null for the purposes
     * of computing the new local view of a document. Both the input and returned
     * documents can be null.
     *
     * @param mutation The mutation to apply.
     * @param maybeDoc The document to mutate. The input document can be null if
     *     the client has no knowledge of the pre-mutation state of the document.
     * @param baseDoc The state of the document prior to this mutation batch. The
     *     input document can be null if the client has no knowledge of the
     *     pre-mutation state of the document.
     * @param localWriteTime A timestamp indicating the local write time of the
     *     batch this mutation is a part of.
     * @return The mutated document. The returned document may be null, but only
     *     if maybeDoc was null and the mutation would not create a new document.
     */ function Ge(t, e, n, r) {
        return t instanceof Qe ? function(t, e) {
            if (!qe(t.Qe, e)) return e;
            var n = ze(e);
            return new rn(t.key, n, t.value, {
                Ge: !0
            });
        }(t, e) : t instanceof We ? function(t, e) {
            if (!qe(t.Qe, e)) return e;
            var n = ze(e), r = He(t, e);
            return new rn(t.key, n, r, {
                Ge: !0
            });
        }(t, e) : t instanceof Ke ? function(t, e, n, r) {
            if (!qe(t.Qe, e)) return e;
            var i = Ye(t, e), o = function(t, e, n, r) {
                for (var i = [], o = 0, s = t; o < s.length; o++) {
                    var u = s[o], a = u.transform, c = null;
                    n instanceof rn && (c = n.field(u.field)), null === c && r instanceof rn && (
                    // If the current document does not contain a value for the mutated
                    // field, use the value that existed before applying this mutation
                    // batch. This solves an edge case where a PatchMutation clears the
                    // values in a nested map before the TransformMutation is applied.
                    c = r.field(u.field)), i.push(Ee(a, c, e));
                }
                return i;
            }(t.fieldTransforms, n, e, r), s = Ze(t, i.data(), o);
            return new rn(t.key, i.version, s, {
                Ge: !0
            });
        }(t, e, r, n) : function(t, e) {
            return qe(t.Qe, e) ? new on(t.key, L.min()) : e;
        }(t, e);
    }

    /**
     * If this mutation is not idempotent, returns the base value to persist with
     * this mutation. If a base value is returned, the mutation is always applied
     * to this base value, even if document has already been updated.
     *
     * The base value is a sparse object that consists of only the document
     * fields for which this mutation contains a non-idempotent transformation
     * (e.g. a numeric increment). The provided value guarantees consistent
     * behavior for non-idempotent transforms and allow us to return the same
     * latency-compensated value even if the backend has already applied the
     * mutation. The base value is null for idempotent mutations, as they can be
     * re-played even if the backend has already applied them.
     *
     * @return a base value to store along with the mutation, or null for
     * idempotent mutations.
     */ function je(t, e) {
        return t instanceof Ke ? function(t, e) {
            for (var n = null, r = 0, i = t.fieldTransforms; r < i.length; r++) {
                var o = i[r], s = e instanceof rn ? e.field(o.field) : void 0, u = Ne(o.transform, s || null);
                null != u && (n = null == n ? (new tn).set(o.field, u) : n.set(o.field, u));
            }
            return n ? n.ze() : null;
        }(t, e) : null;
    }

    function Be(t, e) {
        return t.type === e.type && !!t.key.isEqual(e.key) && !!t.Qe.isEqual(e.Qe) && (0 /* Set */ === t.type ? t.value.isEqual(e.value) : 1 /* Patch */ === t.type ? t.data.isEqual(e.data) && t.qe.isEqual(e.qe) : 2 /* Transform */ !== t.type || b(t.fieldTransforms, t.fieldTransforms, (function(t, e) {
            return function(t, e) {
                return t.field.isEqual(e.field) && function(t, e) {
                    return t instanceof Se && e instanceof Se || t instanceof xe && e instanceof xe ? b(t.elements, e.elements, xt) : t instanceof Le && e instanceof Le ? xt(t.Be, e.Be) : t instanceof Ae && e instanceof Ae;
                }(t.transform, e.transform);
            }(t, e);
        })));
    }

    /**
     * Returns the version from the given document for use as the result of a
     * mutation. Mutations are defined to return the version of the base document
     * only if it is an existing document. Deleted and unknown documents have a
     * post-mutation version of SnapshotVersion.min().
     */ function ze(t) {
        return t instanceof rn ? t.version : L.min();
    }

    /**
     * A mutation that creates or replaces the document at the given key with the
     * object value contents.
     */ var Qe = /** @class */ function(e) {
        function n(t, n, r) {
            var i = this;
            return (i = e.call(this) || this).key = t, i.value = n, i.Qe = r, i.type = 0 /* Set */ , 
            i;
        }
        return t.__extends(n, e), n;
    }(Me), We = /** @class */ function(e) {
        function n(t, n, r, i) {
            var o = this;
            return (o = e.call(this) || this).key = t, o.data = n, o.qe = r, o.Qe = i, o.type = 1 /* Patch */ , 
            o;
        }
        return t.__extends(n, e), n;
    }(Me);

    function He(t, e) {
        return function(t, e) {
            var n = new tn(e);
            return t.qe.fields.forEach((function(e) {
                if (!e._()) {
                    var r = t.data.field(e);
                    null !== r ? n.set(e, r) : n.delete(e);
                }
            })), n.ze();
        }(t, e instanceof rn ? e.data() : Je.empty());
    }

    var Ke = /** @class */ function(e) {
        function n(t, n) {
            var r = this;
            return (r = e.call(this) || this).key = t, r.fieldTransforms = n, r.type = 2 /* Transform */ , 
            // NOTE: We set a precondition of exists: true as a safety-check, since we
            // always combine TransformMutations with a SetMutation or PatchMutation which
            // (if successful) should end up with an existing document.
            r.Qe = Ce.exists(!0), r;
        }
        return t.__extends(n, e), n;
    }(Me);

    function Ye(t, e) {
        return e;
    }

    function Ze(t, e, n) {
        for (var r = new tn(e), i = 0; i < t.fieldTransforms.length; i++) {
            var o = t.fieldTransforms[i];
            r.set(o.field, n[i]);
        }
        return r.ze();
    }

    /** A mutation that deletes the document at the given key. */ var Xe = /** @class */ function(e) {
        function n(t, n) {
            var r = this;
            return (r = e.call(this) || this).key = t, r.Qe = n, r.type = 3 /* Delete */ , r;
        }
        return t.__extends(n, e), n;
    }(Me), $e = /** @class */ function(e) {
        function n(t, n) {
            var r = this;
            return (r = e.call(this) || this).key = t, r.Qe = n, r.type = 4 /* Verify */ , r;
        }
        return t.__extends(n, e), n;
    }(Me), Je = /** @class */ function() {
        function t(t) {
            this.proto = t;
        }
        return t.empty = function() {
            return new t({
                mapValue: {}
            });
        }, 
        /**
         * Returns the value at the given path or null.
         *
         * @param path the path to search
         * @return The value at the path or if there it doesn't exist.
         */
        t.prototype.field = function(t) {
            if (t._()) return this.proto;
            for (var e = this.proto, n = 0; n < t.length - 1; ++n) {
                if (!e.mapValue.fields) return null;
                if (!jt(e = e.mapValue.fields[t.get(n)])) return null;
            }
            return (e = (e.mapValue.fields || {})[t.S()]) || null;
        }, t.prototype.isEqual = function(t) {
            return xt(this.proto, t.proto);
        }, t;
    }(), tn = /** @class */ function() {
        /**
         * @param baseObject The object to mutate.
         */
        function t(t) {
            void 0 === t && (t = Je.empty()), this.He = t, 
            /** A map that contains the accumulated changes in this builder. */
            this.Ye = new Map;
        }
        /**
         * Sets the field to the provided value.
         *
         * @param path The field path to set.
         * @param value The value to set.
         * @return The current Builder instance.
         */    return t.prototype.set = function(t, e) {
            return this.Je(t, e), this;
        }, 
        /**
         * Removes the field at the specified path. If there is no field at the
         * specified path, nothing is changed.
         *
         * @param path The field path to remove.
         * @return The current Builder instance.
         */
        t.prototype.delete = function(t) {
            return this.Je(t, null), this;
        }, 
        /**
         * Adds `value` to the overlay map at `path`. Creates nested map entries if
         * needed.
         */
        t.prototype.Je = function(t, e) {
            for (var n = this.Ye, r = 0; r < t.length - 1; ++r) {
                var i = t.get(r), o = n.get(i);
                o instanceof Map ? 
                // Re-use a previously created map
                n = o : o && 10 /* ObjectValue */ === Dt(o) ? (
                // Convert the existing Protobuf MapValue into a map
                o = new Map(Object.entries(o.mapValue.fields || {})), n.set(i, o), n = o) : (
                // Create an empty map to represent the current nesting level
                o = new Map, n.set(i, o), n = o);
            }
            n.set(t.S(), e);
        }, 
        /** Returns an ObjectValue with all mutations applied. */ t.prototype.ze = function() {
            var t = this.Xe(V.$(), this.Ye);
            return null != t ? new Je(t) : this.He;
        }, 
        /**
         * Applies any overlays from `currentOverlays` that exist at `currentPath`
         * and returns the merged data at `currentPath` (or null if there were no
         * changes).
         *
         * @param currentPath The path at the current nesting level. Can be set to
         * FieldValue.emptyPath() to represent the root.
         * @param currentOverlays The overlays at the current nesting level in the
         * same format as `overlayMap`.
         * @return The merged data at `currentPath` or null if no modifications
         * were applied.
         */
        t.prototype.Xe = function(t, e) {
            var n = this, r = !1, i = this.He.field(t), o = jt(i) ? // If there is already data at the current path, base our
            Object.assign({}, i.mapValue.fields) : {};
            return e.forEach((function(e, i) {
                if (e instanceof Map) {
                    var s = n.Xe(t.child(i), e);
                    null != s && (o[i] = s, r = !0);
                } else null !== e ? (o[i] = e, r = !0) : o.hasOwnProperty(i) && (delete o[i], r = !0);
            })), r ? {
                mapValue: {
                    fields: o
                }
            } : null;
        }, t;
    }();

    /**
     * Returns a FieldMask built from all fields in a MapValue.
     */
    function en(t) {
        var e = [];
        return N(t.fields || {}, (function(t, n) {
            var r = new V([ t ]);
            if (jt(n)) {
                var i = en(n.mapValue).fields;
                if (0 === i.length) 
                // Preserve the empty map by adding it to the FieldMask.
                e.push(r); else 
                // For nested and non-empty ObjectValues, add the FieldPath of the
                // leaf nodes.
                for (var o = 0, s = i; o < s.length; o++) {
                    var u = s[o];
                    e.push(r.child(u));
                }
            } else 
            // For nested and non-empty ObjectValues, add the FieldPath of the leaf
            // nodes.
            e.push(r);
        })), new Oe(e)
        /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
        /**
     * The result of a lookup for a given path may be an existing document or a
     * marker that this document does not exist at a given version.
     */;
    }

    var nn = function(t, e) {
        this.key = t, this.version = e;
    }, rn = /** @class */ function(e) {
        function n(t, n, r, i) {
            var o = this;
            return (o = e.call(this, t, n) || this).Ze = r, o.Ge = !!i.Ge, o.hasCommittedMutations = !!i.hasCommittedMutations, 
            o;
        }
        return t.__extends(n, e), n.prototype.field = function(t) {
            return this.Ze.field(t);
        }, n.prototype.data = function() {
            return this.Ze;
        }, n.prototype.tn = function() {
            return this.Ze.proto;
        }, n.prototype.isEqual = function(t) {
            return t instanceof n && this.key.isEqual(t.key) && this.version.isEqual(t.version) && this.Ge === t.Ge && this.hasCommittedMutations === t.hasCommittedMutations && this.Ze.isEqual(t.Ze);
        }, n.prototype.toString = function() {
            return "Document(" + this.key + ", " + this.version + ", " + this.Ze.toString() + ", {hasLocalMutations: " + this.Ge + "}), {hasCommittedMutations: " + this.hasCommittedMutations + "})";
        }, Object.defineProperty(n.prototype, "hasPendingWrites", {
            get: function() {
                return this.Ge || this.hasCommittedMutations;
            },
            enumerable: !1,
            configurable: !0
        }), n;
    }(nn), on = /** @class */ function(e) {
        function n(t, n, r) {
            var i = this;
            return (i = e.call(this, t, n) || this).hasCommittedMutations = !(!r || !r.hasCommittedMutations), 
            i;
        }
        return t.__extends(n, e), n.prototype.toString = function() {
            return "NoDocument(" + this.key + ", " + this.version + ")";
        }, Object.defineProperty(n.prototype, "hasPendingWrites", {
            get: function() {
                return this.hasCommittedMutations;
            },
            enumerable: !1,
            configurable: !0
        }), n.prototype.isEqual = function(t) {
            return t instanceof n && t.hasCommittedMutations === this.hasCommittedMutations && t.version.isEqual(this.version) && t.key.isEqual(this.key);
        }, n;
    }(nn), sn = /** @class */ function(e) {
        function n() {
            return null !== e && e.apply(this, arguments) || this;
        }
        return t.__extends(n, e), n.prototype.toString = function() {
            return "UnknownDocument(" + this.key + ", " + this.version + ")";
        }, Object.defineProperty(n.prototype, "hasPendingWrites", {
            get: function() {
                return !0;
            },
            enumerable: !1,
            configurable: !0
        }), n.prototype.isEqual = function(t) {
            return t instanceof n && t.version.isEqual(this.version) && t.key.isEqual(this.key);
        }, n;
    }(nn);

    /**
     * Represents a document in Firestore with a key, version, data and whether the
     * data has local mutations applied to it.
     */
    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Casts `obj` to `T`. Throws if  `obj` is not an instance of `T`.
     *
     * This cast is used in the Lite and Full SDK to verify instance types for
     * arguments passed to the public API.
     */
    function un(t, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    e) {
        if (!(t instanceof e)) throw e.name === t.constructor.name ? new x(D.INVALID_ARGUMENT, "Type does not match the expected instance. Did you pass '" + e.name + "' from a different Firestore SDK?") : new x(D.INVALID_ARGUMENT, "Expected type '" + e.name + "', but was '" + t.constructor.name + "'");
        return t;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Query encapsulates all the query attributes we support in the SDK. It can
     * be run against the LocalStore, as well as be converted to a `Target` to
     * query the RemoteStore results.
     *
     * Visible for testing.
     */ var an = /** @class */ function() {
        /**
         * Initializes a Query with a path and optional additional query constraints.
         * Path must currently be empty if this is a collection group query.
         */
        function t(t, e, n, r, i, o /* First */ , s, u) {
            void 0 === e && (e = null), void 0 === n && (n = []), void 0 === r && (r = []), 
            void 0 === i && (i = null), void 0 === o && (o = "F"), void 0 === s && (s = null), 
            void 0 === u && (u = null), this.path = t, this.collectionGroup = e, this.en = n, 
            this.filters = r, this.limit = i, this.nn = o, this.startAt = s, this.endAt = u, 
            this.sn = null, 
            // The corresponding `Target` of this `Query` instance.
            this.rn = null, this.startAt, this.endAt;
        }
        /**
         * Helper to convert a collection group query into a collection query at a
         * specific path. This is used when executing collection group queries, since
         * we have to split the query into a set of collection queries at multiple
         * paths.
         */    return t.prototype.on = function(e) {
            return new t(e, 
            /*collectionGroup=*/ null, this.en.slice(), this.filters.slice(), this.limit, this.nn, this.startAt, this.endAt);
        }, t.prototype.hn = function() {
            return 0 === this.filters.length && null === this.limit && null == this.startAt && null == this.endAt && (0 === this.en.length || 1 === this.en.length && this.en[0].field.M());
        }, t.prototype.an = function() {
            return !C(this.limit) && "F" /* First */ === this.nn;
        }, t.prototype.un = function() {
            return !C(this.limit) && "L" /* Last */ === this.nn;
        }, t.prototype.cn = function() {
            return this.en.length > 0 ? this.en[0].field : null;
        }, t.prototype.ln = function() {
            for (var t = 0, e = this.filters; t < e.length; t++) {
                var n = e[t];
                if (n._n()) return n.field;
            }
            return null;
        }, t.prototype.fn = function(t) {
            for (var e = 0, n = this.filters; e < n.length; e++) {
                var r = n[e];
                if (t.indexOf(r.op) >= 0) return r.op;
            }
            return null;
        }, t;
    }();

    /** Creates a new Query instance with the options provided. */ function cn(t, e, n, r, i, o, s, u) {
        return new an(t, e, n, r, i, o, s, u);
    }

    /** Creates a new Query for a query that matches all documents at `path` */ function hn(t) {
        return new an(t);
    }

    /**
     * Creates a new Query for a collection group query that matches all documents
     * within the provided collection group.
     */
    /**
     * Returns whether the query matches a collection group rather than a specific
     * collection.
     */ function fn(t) {
        return null !== t.collectionGroup;
    }

    /**
     * Returns the implicit order by constraint that is used to execute the Query,
     * which can be different from the order by constraints the user provided (e.g.
     * the SDK and backend always orders by `__name__`).
     */ function ln(t) {
        var e = un(t, an);
        if (null === e.sn) {
            e.sn = [];
            var n = e.ln(), r = e.cn();
            if (null !== n && null === r) 
            // In order to implicitly add key ordering, we must also add the
            // inequality filter field for it to be a valid query.
            // Note that the default inequality field and key ordering is ascending.
            n.M() || e.sn.push(new Vn(n)), e.sn.push(new Vn(V.L(), "asc" /* ASCENDING */)); else {
                for (var i = !1, o = 0, s = e.en; o < s.length; o++) {
                    var u = s[o];
                    e.sn.push(u), u.field.M() && (i = !0);
                }
                if (!i) {
                    // The order of the implicit key ordering always matches the last
                    // explicit order by
                    var a = e.en.length > 0 ? e.en[e.en.length - 1].dir : "asc" /* ASCENDING */;
                    e.sn.push(new Vn(V.L(), a));
                }
            }
        }
        return e.sn;
    }

    /**
     * Converts this `Query` instance to it's corresponding `Target` representation.
     */ function pn(t) {
        var e = un(t, an);
        if (!e.rn) if ("F" /* First */ === e.nn) e.rn = G(e.path, e.collectionGroup, ln(e), e.filters, e.limit, e.startAt, e.endAt); else {
            for (
            // Flip the orderBy directions since we want the last results
            var n = [], r = 0, i = ln(e); r < i.length; r++) {
                var o = i[r], s = "desc" /* DESCENDING */ === o.dir ? "asc" /* ASCENDING */ : "desc" /* DESCENDING */;
                n.push(new Vn(o.field, s));
            }
            // We need to swap the cursors to match the now-flipped query ordering.
                    var u = e.endAt ? new Ln(e.endAt.position, !e.endAt.before) : null, a = e.startAt ? new Ln(e.startAt.position, !e.startAt.before) : null;
            // Now return as a LimitType.First query.
                    e.rn = G(e.path, e.collectionGroup, n, e.filters, e.limit, u, a);
        }
        return e.rn;
    }

    function dn(t, e, n) {
        return new an(t.path, t.collectionGroup, t.en.slice(), t.filters.slice(), e, n, t.startAt, t.endAt);
    }

    function yn(t, e) {
        return new an(t.path, t.collectionGroup, t.en.slice(), t.filters.slice(), t.limit, t.nn, e, t.endAt);
    }

    function vn(t, e) {
        return new an(t.path, t.collectionGroup, t.en.slice(), t.filters.slice(), t.limit, t.nn, t.startAt, e);
    }

    function gn(t, e) {
        return B(pn(t), pn(e)) && t.nn === e.nn;
    }

    // TODO(b/29183165): This is used to get a unique string from a query to, for
    // example, use as a dictionary key, but the implementation is subject to
    // collisions. Make it collision-free.
    function mn(t) {
        return j(pn(t)) + "|lt:" + t.nn;
    }

    function wn(t) {
        return "Query(target=" + function(t) {
            var e = t.path.F();
            return null !== t.collectionGroup && (e += " collectionGroup=" + t.collectionGroup), 
            t.filters.length > 0 && (e += ", filters: [" + t.filters.map((function(t) {
                return (e = t).field.F() + " " + e.op + " " + Pt(e.value);
                /** Returns a debug description for `filter`. */            var e;
                /** Filter that matches on key fields (i.e. '__name__'). */        })).join(", ") + "]"), 
            C(t.limit) || (e += ", limit: " + t.limit), t.orderBy.length > 0 && (e += ", orderBy: [" + t.orderBy.map((function(t) {
                return (e = t).field.F() + " (" + e.dir + ")";
                var e;
            })).join(", ") + "]"), t.startAt && (e += ", startAt: " + Rn(t.startAt)), t.endAt && (e += ", endAt: " + Rn(t.endAt)), 
            "Target(" + e + ")";
        }(pn(t)) + "; limitType=" + t.nn + ")";
    }

    /** Returns whether `doc` matches the constraints of `query`. */ function bn(t, e) {
        return function(t, e) {
            var n = e.key.path;
            return null !== t.collectionGroup ? e.key.W(t.collectionGroup) && t.path.D(n) : U.j(t.path) ? t.path.isEqual(n) : t.path.C(n);
        }(t, e) && function(t, e) {
            for (var n = 0, r = t.en; n < r.length; n++) {
                var i = r[n];
                // order by key always matches
                            if (!i.field.M() && null === e.field(i.field)) return !1;
            }
            return !0;
        }(t, e) && function(t, e) {
            for (var n = 0, r = t.filters; n < r.length; n++) {
                if (!r[n].matches(e)) return !1;
            }
            return !0;
        }(t, e) && function(t, e) {
            return !(t.startAt && !Pn(t.startAt, ln(t), e)) && (!t.endAt || !Pn(t.endAt, ln(t), e));
        }(t, e);
    }

    function _n(t) {
        return function(e, n) {
            for (var r = !1, i = 0, o = ln(t); i < o.length; i++) {
                var s = o[i], u = Un(s, e, n);
                if (0 !== u) return u;
                r = r || s.field.M();
            }
            return 0;
        };
    }

    var In = /** @class */ function(e) {
        function n(t, n, r) {
            var i = this;
            return (i = e.call(this) || this).field = t, i.op = n, i.value = r, i;
        }
        /**
         * Creates a filter based on the provided arguments.
         */    return t.__extends(n, e), n.create = function(t, e, r) {
            if (t.M()) return "in" /* IN */ === e || "not-in" /* NOT_IN */ === e ? this.dn(t, e, r) : new En(t, e, r);
            if (Ft(r)) {
                if ("==" /* EQUAL */ !== e && "!=" /* NOT_EQUAL */ !== e) 
                // TODO(ne-queries): Update error message to include != comparison.
                throw new x(D.INVALID_ARGUMENT, "Invalid query. Null supports only equality comparisons.");
                return new n(t, e, r);
            }
            if (Gt(r)) {
                if ("==" /* EQUAL */ !== e && "!=" /* NOT_EQUAL */ !== e) 
                // TODO(ne-queries): Update error message to include != comparison.
                throw new x(D.INVALID_ARGUMENT, "Invalid query. NaN supports only equality comparisons.");
                return new n(t, e, r);
            }
            return "array-contains" /* ARRAY_CONTAINS */ === e ? new Sn(t, r) : "in" /* IN */ === e ? new Dn(t, r) : "not-in" /* NOT_IN */ === e ? new xn(t, r) : "array-contains-any" /* ARRAY_CONTAINS_ANY */ === e ? new kn(t, r) : new n(t, e, r);
        }, n.dn = function(t, e, n) {
            return "in" /* IN */ === e ? new Tn(t, n) : new Nn(t, n);
        }, n.prototype.matches = function(t) {
            var e = t.field(this.field);
            // Types do not have to match in NOT_EQUAL filters.
                    return "!=" /* NOT_EQUAL */ === this.op ? null !== e && this.wn(Lt(e, this.value)) : null !== e && Dt(this.value) === Dt(e) && this.wn(Lt(e, this.value));
            // Only compare types with matching backend order (such as double and int).
            }, n.prototype.wn = function(t) {
            switch (this.op) {
              case "<" /* LESS_THAN */ :
                return t < 0;

              case "<=" /* LESS_THAN_OR_EQUAL */ :
                return t <= 0;

              case "==" /* EQUAL */ :
                return 0 === t;

              case "!=" /* NOT_EQUAL */ :
                return 0 !== t;

              case ">" /* GREATER_THAN */ :
                return t > 0;

              case ">=" /* GREATER_THAN_OR_EQUAL */ :
                return t >= 0;

              default:
                return d();
            }
        }, n.prototype._n = function() {
            return [ "<" /* LESS_THAN */ , "<=" /* LESS_THAN_OR_EQUAL */ , ">" /* GREATER_THAN */ , ">=" /* GREATER_THAN_OR_EQUAL */ , "!=" /* NOT_EQUAL */ ].indexOf(this.op) >= 0;
        }, n;
    }((function() {}));

    var En = /** @class */ function(e) {
        function n(t, n, r) {
            var i = this;
            return (i = e.call(this, t, n, r) || this).key = U.U(r.referenceValue), i;
        }
        return t.__extends(n, e), n.prototype.matches = function(t) {
            var e = U.P(t.key, this.key);
            return this.wn(e);
        }, n;
    }(In), Tn = /** @class */ function(e) {
        function n(t, n) {
            var r = this;
            return (r = e.call(this, t, "in" /* IN */ , n) || this).keys = An("in" /* IN */ , n), 
            r;
        }
        return t.__extends(n, e), n.prototype.matches = function(t) {
            return this.keys.some((function(e) {
                return e.isEqual(t.key);
            }));
        }, n;
    }(In), Nn = /** @class */ function(e) {
        function n(t, n) {
            var r = this;
            return (r = e.call(this, t, "not-in" /* NOT_IN */ , n) || this).keys = An("not-in" /* NOT_IN */ , n), 
            r;
        }
        return t.__extends(n, e), n.prototype.matches = function(t) {
            return !this.keys.some((function(e) {
                return e.isEqual(t.key);
            }));
        }, n;
    }(In);

    /** Filter that matches on key fields within an array. */ function An(t, e) {
        var n;
        return ((null === (n = e.arrayValue) || void 0 === n ? void 0 : n.values) || []).map((function(t) {
            return U.U(t.referenceValue);
        }));
    }

    /** A Filter that implements the array-contains operator. */ var Sn = /** @class */ function(e) {
        function n(t, n) {
            return e.call(this, t, "array-contains" /* ARRAY_CONTAINS */ , n) || this;
        }
        return t.__extends(n, e), n.prototype.matches = function(t) {
            var e = t.field(this.field);
            return Mt(e) && kt(e.arrayValue, this.value);
        }, n;
    }(In), Dn = /** @class */ function(e) {
        function n(t, n) {
            return e.call(this, t, "in" /* IN */ , n) || this;
        }
        return t.__extends(n, e), n.prototype.matches = function(t) {
            var e = t.field(this.field);
            return null !== e && kt(this.value.arrayValue, e);
        }, n;
    }(In), xn = /** @class */ function(e) {
        function n(t, n) {
            return e.call(this, t, "not-in" /* NOT_IN */ , n) || this;
        }
        return t.__extends(n, e), n.prototype.matches = function(t) {
            var e = t.field(this.field);
            return null !== e && !kt(this.value.arrayValue, e);
        }, n;
    }(In), kn = /** @class */ function(e) {
        function n(t, n) {
            return e.call(this, t, "array-contains-any" /* ARRAY_CONTAINS_ANY */ , n) || this;
        }
        return t.__extends(n, e), n.prototype.matches = function(t) {
            var e = this, n = t.field(this.field);
            return !(!Mt(n) || !n.arrayValue.values) && n.arrayValue.values.some((function(t) {
                return kt(e.value.arrayValue, t);
            }));
        }, n;
    }(In), Ln = function(t, e) {
        this.position = t, this.before = e;
    };

    /** A Filter that implements the IN operator. */ function Rn(t) {
        // TODO(b/29183165): Make this collision robust.
        return (t.before ? "b" : "a") + ":" + t.position.map((function(t) {
            return Pt(t);
        })).join(",");
    }

    /**
     * Returns true if a document sorts before a bound using the provided sort
     * order.
     */ function Pn(t, e, n) {
        for (var r = 0, i = 0; i < t.position.length; i++) {
            var o = e[i], s = t.position[i];
            if (r = o.field.M() ? U.P(U.U(s.referenceValue), n.key) : Lt(s, n.field(o.field)), 
            "desc" /* DESCENDING */ === o.dir && (r *= -1), 0 !== r) break;
        }
        return t.before ? r <= 0 : r < 0;
    }

    function On(t, e) {
        if (null === t) return null === e;
        if (null === e) return !1;
        if (t.before !== e.before || t.position.length !== e.position.length) return !1;
        for (var n = 0; n < t.position.length; n++) if (!xt(t.position[n], e.position[n])) return !1;
        return !0;
    }

    /**
     * An ordering on a field, in some Direction. Direction defaults to ASCENDING.
     */ var Vn = function(t, e /* ASCENDING */) {
        void 0 === e && (e = "asc"), this.field = t, this.dir = e;
    };

    function Un(t, e, n) {
        var r = t.field.M() ? U.P(e.key, n.key) : function(t, e, n) {
            var r = e.field(t), i = n.field(t);
            return null !== r && null !== i ? Lt(r, i) : d();
        }(t.field, e, n);
        switch (t.dir) {
          case "asc" /* ASCENDING */ :
            return r;

          case "desc" /* DESCENDING */ :
            return -1 * r;

          default:
            return d();
        }
    }

    function Cn(t, e) {
        return t.dir === e.dir && t.field.isEqual(e.field);
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A batch of mutations that will be sent as one unit to the backend.
     */ var qn = /** @class */ function() {
        /**
         * @param batchId The unique ID of this mutation batch.
         * @param localWriteTime The original write time of this mutation.
         * @param baseMutations Mutations that are used to populate the base
         * values when this mutation is applied locally. This can be used to locally
         * overwrite values that are persisted in the remote document cache. Base
         * mutations are never sent to the backend.
         * @param mutations The user-provided mutations in this mutation batch.
         * User-provided mutations are applied both locally and remotely on the
         * backend.
         */
        function t(t, e, n, r) {
            this.batchId = t, this.Tn = e, this.baseMutations = n, this.mutations = r
            /**
         * Applies all the mutations in this MutationBatch to the specified document
         * to create a new remote document
         *
         * @param docKey The key of the document to apply mutations to.
         * @param maybeDoc The document to apply mutations to.
         * @param batchResult The result of applying the MutationBatch to the
         * backend.
         */;
        }
        return t.prototype.En = function(t, e, n) {
            for (var r = n.In, i = 0; i < this.mutations.length; i++) {
                var o = this.mutations[i];
                o.key.isEqual(t) && (e = Fe(o, e, r[i]));
            }
            return e;
        }, 
        /**
         * Computes the local view of a document given all the mutations in this
         * batch.
         *
         * @param docKey The key of the document to apply mutations to.
         * @param maybeDoc The document to apply mutations to.
         */
        t.prototype.mn = function(t, e) {
            // First, apply the base state. This allows us to apply non-idempotent
            // transform against a consistent set of values.
            for (var n = 0, r = this.baseMutations; n < r.length; n++) {
                var i = r[n];
                i.key.isEqual(t) && (e = Ge(i, e, e, this.Tn));
            }
            // Second, apply all user-provided mutations.
            for (var o = e, s = 0, u = this.mutations; s < u.length; s++) {
                var a = u[s];
                a.key.isEqual(t) && (e = Ge(a, e, o, this.Tn));
            }
            return e;
        }, 
        /**
         * Computes the local view for all provided documents given the mutations in
         * this batch.
         */
        t.prototype.An = function(t) {
            var e = this, n = t;
            // TODO(mrschmidt): This implementation is O(n^2). If we apply the mutations
            // directly (as done in `applyToLocalView()`), we can reduce the complexity
            // to O(n).
                    return this.mutations.forEach((function(r) {
                var i = e.mn(r.key, t.get(r.key));
                i && (n = n.st(r.key, i));
            })), n;
        }, t.prototype.keys = function() {
            return this.mutations.reduce((function(t, e) {
                return t.add(e.key);
            }), ht());
        }, t.prototype.isEqual = function(t) {
            return this.batchId === t.batchId && b(this.mutations, t.mutations, (function(t, e) {
                return Be(t, e);
            })) && b(this.baseMutations, t.baseMutations, (function(t, e) {
                return Be(t, e);
            }));
        }, t;
    }(), Mn = /** @class */ function() {
        function t(t, e, n, 
        /**
         * A pre-computed mapping from each mutated document to the resulting
         * version.
         */
        r) {
            this.batch = t, this.Rn = e, this.In = n, this.Pn = r
            /**
         * Creates a new MutationBatchResult for the given batch and results. There
         * must be one result for each mutation in the batch. This static factory
         * caches a document=>version mapping (docVersions).
         */;
        }
        return t.from = function(e, n, r) {
            y(e.mutations.length === r.length);
            for (var i = at, o = e.mutations, s = 0; s < o.length; s++) i = i.st(o[s].key, r[s].version);
            return new t(e, n, r, i);
        }, t;
    }(), Fn = /** @class */ function() {
        function t(t) {
            var e = this;
            // NOTE: next/catchCallback will always point to our own wrapper functions,
            // not the user's raw next() or catch() callbacks.
                    this.gn = null, this.Vn = null, 
            // When the operation resolves, we'll set result or error and mark isDone.
            this.result = void 0, this.error = void 0, this.yn = !1, 
            // Set to true when .then() or .catch() are called and prevents additional
            // chaining.
            this.pn = !1, t((function(t) {
                e.yn = !0, e.result = t, e.gn && 
                // value should be defined unless T is Void, but we can't express
                // that in the type system.
                e.gn(t);
            }), (function(t) {
                e.yn = !0, e.error = t, e.Vn && e.Vn(t);
            }));
        }
        return t.prototype.catch = function(t) {
            return this.next(void 0, t);
        }, t.prototype.next = function(e, n) {
            var r = this;
            return this.pn && d(), this.pn = !0, this.yn ? this.error ? this.bn(n, this.error) : this.vn(e, this.result) : new t((function(t, i) {
                r.gn = function(n) {
                    r.vn(e, n).next(t, i);
                }, r.Vn = function(e) {
                    r.bn(n, e).next(t, i);
                };
            }));
        }, t.prototype.Sn = function() {
            var t = this;
            return new Promise((function(e, n) {
                t.next(e, n);
            }));
        }, t.prototype.Dn = function(e) {
            try {
                var n = e();
                return n instanceof t ? n : t.resolve(n);
            } catch (e) {
                return t.reject(e);
            }
        }, t.prototype.vn = function(e, n) {
            return e ? this.Dn((function() {
                return e(n);
            })) : t.resolve(n);
        }, t.prototype.bn = function(e, n) {
            return e ? this.Dn((function() {
                return e(n);
            })) : t.reject(n);
        }, t.resolve = function(e) {
            return new t((function(t, n) {
                t(e);
            }));
        }, t.reject = function(e) {
            return new t((function(t, n) {
                n(e);
            }));
        }, t.Cn = function(
        // Accept all Promise types in waitFor().
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        e) {
            return new t((function(t, n) {
                var r = 0, i = 0, o = !1;
                e.forEach((function(e) {
                    ++r, e.next((function() {
                        ++i, o && i === r && t();
                    }), (function(t) {
                        return n(t);
                    }));
                })), o = !0, i === r && t();
            }));
        }, 
        /**
         * Given an array of predicate functions that asynchronously evaluate to a
         * boolean, implements a short-circuiting `or` between the results. Predicates
         * will be evaluated until one of them returns `true`, then stop. The final
         * result will be whether any of them returned `true`.
         */
        t.Nn = function(e) {
            for (var n = t.resolve(!1), r = function(e) {
                n = n.next((function(n) {
                    return n ? t.resolve(n) : e();
                }));
            }, i = 0, o = e; i < o.length; i++) {
                r(o[i]);
            }
            return n;
        }, t.forEach = function(t, e) {
            var n = this, r = [];
            return t.forEach((function(t, i) {
                r.push(e.call(n, t, i));
            })), this.Cn(r);
        }, t;
    }(), Gn = /** @class */ function() {
        function t() {
            // A mapping of document key to the new cache entry that should be written (or null if any
            // existing cache entry should be removed).
            this.Fn = new S((function(t) {
                return t.toString();
            }), (function(t, e) {
                return t.isEqual(e);
            })), this.kn = !1;
        }
        return Object.defineProperty(t.prototype, "readTime", {
            get: function() {
                return this.$n;
            },
            set: function(t) {
                this.$n = t;
            },
            enumerable: !1,
            configurable: !0
        }), 
        /**
         * Buffers a `RemoteDocumentCache.addEntry()` call.
         *
         * You can only modify documents that have already been retrieved via
         * `getEntry()/getEntries()` (enforced via IndexedDbs `apply()`).
         */
        t.prototype.xn = function(t, e) {
            this.On(), this.readTime = e, this.Fn.set(t.key, t);
        }, 
        /**
         * Buffers a `RemoteDocumentCache.removeEntry()` call.
         *
         * You can only remove documents that have already been retrieved via
         * `getEntry()/getEntries()` (enforced via IndexedDbs `apply()`).
         */
        t.prototype.Mn = function(t, e) {
            this.On(), e && (this.readTime = e), this.Fn.set(t, null);
        }, 
        /**
         * Looks up an entry in the cache. The buffered changes will first be checked,
         * and if no buffered change applies, this will forward to
         * `RemoteDocumentCache.getEntry()`.
         *
         * @param transaction The transaction in which to perform any persistence
         *     operations.
         * @param documentKey The key of the entry to look up.
         * @return The cached Document or NoDocument entry, or null if we have nothing
         * cached.
         */
        t.prototype.Ln = function(t, e) {
            this.On();
            var n = this.Fn.get(e);
            return void 0 !== n ? Fn.resolve(n) : this.qn(t, e);
        }, 
        /**
         * Looks up several entries in the cache, forwarding to
         * `RemoteDocumentCache.getEntry()`.
         *
         * @param transaction The transaction in which to perform any persistence
         *     operations.
         * @param documentKeys The keys of the entries to look up.
         * @return A map of cached `Document`s or `NoDocument`s, indexed by key. If an
         *     entry cannot be found, the corresponding key will be mapped to a null
         *     value.
         */
        t.prototype.getEntries = function(t, e) {
            return this.Bn(t, e);
        }, 
        /**
         * Applies buffered changes to the underlying RemoteDocumentCache, using
         * the provided transaction.
         */
        t.prototype.apply = function(t) {
            return this.On(), this.kn = !0, this.Un(t);
        }, 
        /** Helper to assert this.changes is not null  */ t.prototype.On = function() {}, 
        t;
    }(), jn = "The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.", Bn = /** @class */ function() {
        function t() {
            this.Qn = [];
        }
        return t.prototype.Wn = function(t) {
            this.Qn.push(t);
        }, t.prototype.jn = function() {
            this.Qn.forEach((function(t) {
                return t();
            }));
        }, t;
    }(), zn = /** @class */ function() {
        function t(t, e, n) {
            this.Kn = t, this.Gn = e, this.zn = n
            /**
         * Get the local view of the document identified by `key`.
         *
         * @return Local view of the document or null if we don't have any cached
         * state for it.
         */;
        }
        return t.prototype.Hn = function(t, e) {
            var n = this;
            return this.Gn.Yn(t, e).next((function(r) {
                return n.Jn(t, e, r);
            }));
        }, 
        /** Internal version of `getDocument` that allows reusing batches. */ t.prototype.Jn = function(t, e, n) {
            return this.Kn.Ln(t, e).next((function(t) {
                for (var r = 0, i = n; r < i.length; r++) {
                    t = i[r].mn(e, t);
                }
                return t;
            }));
        }, 
        // Returns the view of the given `docs` as they would appear after applying
        // all mutations in the given `batches`.
        t.prototype.Xn = function(t, e, n) {
            var r = ot();
            return e.forEach((function(t, e) {
                for (var i = 0, o = n; i < o.length; i++) {
                    e = o[i].mn(t, e);
                }
                r = r.st(t, e);
            })), r;
        }, 
        /**
         * Gets the local view of the documents identified by `keys`.
         *
         * If we don't have cached state for a document in `keys`, a NoDocument will
         * be stored for that key in the resulting set.
         */
        t.prototype.Zn = function(t, e) {
            var n = this;
            return this.Kn.getEntries(t, e).next((function(e) {
                return n.ts(t, e);
            }));
        }, 
        /**
         * Similar to `getDocuments`, but creates the local view from the given
         * `baseDocs` without retrieving documents from the local store.
         */
        t.prototype.ts = function(t, e) {
            var n = this;
            return this.Gn.es(t, e).next((function(r) {
                var i = n.Xn(t, e, r), o = it();
                return i.forEach((function(t, e) {
                    // TODO(http://b/32275378): Don't conflate missing / deleted.
                    e || (e = new on(t, L.min())), o = o.st(t, e);
                })), o;
            }));
        }, 
        /**
         * Performs a query against the local view of all documents.
         *
         * @param transaction The persistence transaction.
         * @param query The query to match documents against.
         * @param sinceReadTime If not set to SnapshotVersion.min(), return only
         *     documents that have been read since this snapshot version (exclusive).
         */
        t.prototype.ns = function(t, e, n) {
            /**
     * Returns whether the query matches a single document by path (rather than a
     * collection).
     */
            return function(t) {
                return U.j(t.path) && null === t.collectionGroup && 0 === t.filters.length;
            }(e) ? this.ss(t, e.path) : fn(e) ? this.rs(t, e, n) : this.os(t, e, n);
        }, t.prototype.ss = function(t, e) {
            // Just do a simple document lookup.
            return this.Hn(t, new U(e)).next((function(t) {
                var e = ut();
                return t instanceof rn && (e = e.st(t.key, t)), e;
            }));
        }, t.prototype.rs = function(t, e, n) {
            var r = this, i = e.collectionGroup, o = ut();
            return this.zn.hs(t, i).next((function(s) {
                return Fn.forEach(s, (function(s) {
                    var u = e.on(s.child(i));
                    return r.os(t, u, n).next((function(t) {
                        t.forEach((function(t, e) {
                            o = o.st(t, e);
                        }));
                    }));
                })).next((function() {
                    return o;
                }));
            }));
        }, t.prototype.os = function(t, e, n) {
            var r, i, o = this;
            // Query the remote documents and overlay mutations.
                    return this.Kn.ns(t, e, n).next((function(n) {
                return r = n, o.Gn.as(t, e);
            })).next((function(e) {
                return i = e, o.us(t, i, r).next((function(t) {
                    r = t;
                    for (var e = 0, n = i; e < n.length; e++) for (var o = n[e], s = 0, u = o.mutations; s < u.length; s++) {
                        var a = u[s], c = a.key, h = r.get(c), f = Ge(a, h, h, o.Tn);
                        r = f instanceof rn ? r.st(c, f) : r.remove(c);
                    }
                }));
            })).next((function() {
                // Finally, filter out any documents that don't actually match
                // the query.
                return r.forEach((function(t, n) {
                    bn(e, n) || (r = r.remove(t));
                })), r;
            }));
        }, t.prototype.us = function(t, e, n) {
            for (var r = ht(), i = 0, o = e; i < o.length; i++) for (var s = 0, u = o[i].mutations; s < u.length; s++) {
                var a = u[s];
                a instanceof We && null === n.get(a.key) && (r = r.add(a.key));
            }
            var c = n;
            return this.Kn.getEntries(t, r).next((function(t) {
                return t.forEach((function(t, e) {
                    null !== e && e instanceof rn && (c = c.st(t, e));
                })), c;
            }));
        }, t;
    }(), Qn = /** @class */ function() {
        function t(t, e, n, r) {
            this.targetId = t, this.fromCache = e, this.cs = n, this.ls = r;
        }
        return t._s = function(e, n) {
            for (var r = ht(), i = ht(), o = 0, s = n.docChanges; o < s.length; o++) {
                var u = s[o];
                switch (u.type) {
                  case 0 /* Added */ :
                    r = r.add(u.doc.key);
                    break;

                  case 1 /* Removed */ :
                    i = i.add(u.doc.key);
                    // do nothing
                            }
            }
            return new t(e, n.fromCache, r, i);
        }, t;
    }(), Wn = /** @class */ function() {
        function t(t, e) {
            var n = this;
            this.previousValue = t, e && (e.fs = function(t) {
                return n.ds(t);
            }, this.ws = function(t) {
                return e.Ts(t);
            });
        }
        return t.prototype.ds = function(t) {
            return this.previousValue = Math.max(t, this.previousValue), this.previousValue;
        }, t.prototype.next = function() {
            var t = ++this.previousValue;
            return this.ws && this.ws(t), t;
        }, t;
    }();

    /** The result of applying a mutation batch to the backend. */ Wn.Es = -1;

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var Hn = function() {
        var t = this;
        this.promise = new Promise((function(e, n) {
            t.resolve = e, t.reject = n;
        }));
    }, Kn = /** @class */ function() {
        function t(
        /**
         * The AsyncQueue to run backoff operations on.
         */
        t, 
        /**
         * The ID to use when scheduling backoff operations on the AsyncQueue.
         */
        e, 
        /**
         * The initial delay (used as the base delay on the first retry attempt).
         * Note that jitter will still be applied, so the actual delay could be as
         * little as 0.5*initialDelayMs.
         */
        n
        /**
         * The multiplier to use to determine the extended base delay after each
         * attempt.
         */ , r
        /**
         * The maximum base delay after which no further backoff is performed.
         * Note that jitter will still be applied, so the actual delay could be as
         * much as 1.5*maxDelayMs.
         */ , i) {
            void 0 === n && (n = 1e3), void 0 === r && (r = 1.5), void 0 === i && (i = 6e4), 
            this.Is = t, this.ms = e, this.As = n, this.Rs = r, this.Ps = i, this.gs = 0, this.Vs = null, 
            /** The last backoff attempt, as epoch milliseconds. */
            this.ys = Date.now(), this.reset();
        }
        /**
         * Resets the backoff delay.
         *
         * The very next backoffAndWait() will have no delay. If it is called again
         * (i.e. due to an error), initialDelayMs (plus jitter) will be used, and
         * subsequent ones will increase according to the backoffFactor.
         */    return t.prototype.reset = function() {
            this.gs = 0;
        }, 
        /**
         * Resets the backoff delay to the maximum delay (e.g. for use after a
         * RESOURCE_EXHAUSTED error).
         */
        t.prototype.ps = function() {
            this.gs = this.Ps;
        }, 
        /**
         * Returns a promise that resolves after currentDelayMs, and increases the
         * delay for any subsequent attempts. If there was a pending backoff operation
         * already, it will be canceled.
         */
        t.prototype.bs = function(t) {
            var e = this;
            // Cancel any pending backoff operation.
                    this.cancel();
            // First schedule using the current base (which may be 0 and should be
            // honored as such).
            var n = Math.floor(this.gs + this.vs()), r = Math.max(0, Date.now() - this.ys), i = Math.max(0, n - r);
            // Guard against lastAttemptTime being in the future due to a clock change.
                    i > 0 && h("ExponentialBackoff", "Backing off for " + i + " ms (base delay: " + this.gs + " ms, delay with jitter: " + n + " ms, last attempt: " + r + " ms ago)"), 
            this.Vs = this.Is.Ss(this.ms, i, (function() {
                return e.ys = Date.now(), t();
            })), 
            // Apply backoff factor to determine next delay and ensure it is within
            // bounds.
            this.gs *= this.Rs, this.gs < this.As && (this.gs = this.As), this.gs > this.Ps && (this.gs = this.Ps);
        }, t.prototype.Ds = function() {
            null !== this.Vs && (this.Vs.Cs(), this.Vs = null);
        }, t.prototype.cancel = function() {
            null !== this.Vs && (this.Vs.cancel(), this.Vs = null);
        }, 
        /** Returns a random value in the range [-currentBaseMs/2, currentBaseMs/2] */ t.prototype.vs = function() {
            return (Math.random() - .5) * this.gs;
        }, t;
    }(), Yn = /** @class */ function() {
        /*
         * Creates a new SimpleDb wrapper for IndexedDb database `name`.
         *
         * Note that `version` must not be a downgrade. IndexedDB does not support
         * downgrading the schema version. We currently do not support any way to do
         * versioning outside of IndexedDB's versioning mechanism, as only
         * version-upgrade transactions are allowed to do things like create
         * objectstores.
         */
        function e(t, n, i) {
            this.name = t, this.version = n, this.Ns = i, 
            // NOTE: According to https://bugs.webkit.org/show_bug.cgi?id=197050, the
            // bug we're checking for should exist in iOS >= 12.2 and < 13, but for
            // whatever reason it's much harder to hit after 12.2 so we only proactively
            // log on 12.2.
            12.2 === e.Fs(r.getUA()) && f("Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.");
        }
        /** Deletes the specified database. */    return e.delete = function(t) {
            return h("SimpleDb", "Removing database:", t), er(window.indexedDB.deleteDatabase(t)).Sn();
        }, 
        /** Returns true if IndexedDB is available in the current environment. */ e.ks = function() {
            if ("undefined" == typeof indexedDB) return !1;
            if (e.$s()) return !0;
            // We extensively use indexed array values and compound keys,
            // which IE and Edge do not support. However, they still have indexedDB
            // defined on the window, so we need to check for them here and make sure
            // to return that persistence is not enabled for those browsers.
            // For tracking support of this feature, see here:
            // https://developer.microsoft.com/en-us/microsoft-edge/platform/status/indexeddbarraysandmultientrysupport/
            // Check the UA string to find out the browser.
                    var t = r.getUA(), n = e.Fs(t), i = 0 < n && n < 10, o = e.xs(t), s = 0 < o && o < 4.5;
            // IE 10
            // ua = 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0)';
            // IE 11
            // ua = 'Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko';
            // Edge
            // ua = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML,
            // like Gecko) Chrome/39.0.2171.71 Safari/537.36 Edge/12.0';
            // iOS Safari: Disable for users running iOS version < 10.
                    return !(t.indexOf("MSIE ") > 0 || t.indexOf("Trident/") > 0 || t.indexOf("Edge/") > 0 || i || s);
        }, 
        /**
         * Returns true if the backing IndexedDB store is the Node IndexedDBShim
         * (see https://github.com/axemclion/IndexedDBShim).
         */
        e.$s = function() {
            var t;
            return "undefined" != typeof process && "YES" === (null === (t = process.env) || void 0 === t ? void 0 : t.Os);
        }, 
        /** Helper to get a typed SimpleDbStore from a transaction. */ e.Ms = function(t, e) {
            return t.store(e);
        }, 
        // visible for testing
        /** Parse User Agent to determine iOS version. Returns -1 if not found. */
        e.Fs = function(t) {
            var e = t.match(/i(?:phone|pad|pod) os ([\d_]+)/i), n = e ? e[1].split("_").slice(0, 2).join(".") : "-1";
            return Number(n);
        }, 
        // visible for testing
        /** Parse User Agent to determine Android version. Returns -1 if not found. */
        e.xs = function(t) {
            var e = t.match(/Android ([\d.]+)/i), n = e ? e[1].split(".").slice(0, 2).join(".") : "-1";
            return Number(n);
        }, 
        /**
         * Opens the specified database, creating or upgrading it if necessary.
         */
        e.prototype.Ls = function() {
            return t.__awaiter(this, void 0, void 0, (function() {
                var e, n = this;
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        return this.db ? [ 3 /*break*/ , 2 ] : (h("SimpleDb", "Opening database:", this.name), 
                        e = this, [ 4 /*yield*/ , new Promise((function(t, e) {
                            // TODO(mikelehen): Investigate browser compatibility.
                            // https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
                            // suggests IE9 and older WebKit browsers handle upgrade
                            // differently. They expect setVersion, as described here:
                            // https://developer.mozilla.org/en-US/docs/Web/API/IDBVersionChangeRequest/setVersion
                            var r = indexedDB.open(n.name, n.version);
                            r.onsuccess = function(e) {
                                var n = e.target.result;
                                t(n);
                            }, r.onblocked = function() {
                                e(new Xn("Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed."));
                            }, r.onerror = function(t) {
                                var n = t.target.error;
                                "VersionError" === n.name ? e(new x(D.FAILED_PRECONDITION, "A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.")) : e(new Xn(n));
                            }, r.onupgradeneeded = function(t) {
                                h("SimpleDb", 'Database "' + n.name + '" requires upgrade from version:', t.oldVersion);
                                var e = t.target.result;
                                n.Ns.createOrUpgrade(e, r.transaction, t.oldVersion, n.version).next((function() {
                                    h("SimpleDb", "Database upgrade to version " + n.version + " complete");
                                }));
                            };
                        })) ]);

                      case 1:
                        e.db = t.sent(), t.label = 2;

                      case 2:
                        return [ 2 /*return*/ , (this.qs && (this.db.onversionchange = function(t) {
                            return n.qs(t);
                        }), this.db) ];
                    }
                }));
            }));
        }, e.prototype.Bs = function(t) {
            this.qs = t, this.db && (this.db.onversionchange = function(e) {
                return t(e);
            });
        }, e.prototype.runTransaction = function(e, n, r) {
            return t.__awaiter(this, void 0, void 0, (function() {
                var i, o, s, u, a;
                return t.__generator(this, (function(c) {
                    switch (c.label) {
                      case 0:
                        i = "readonly" === e, o = 0, s = function() {
                            var e, s, a, c, f;
                            return t.__generator(this, (function(t) {
                                switch (t.label) {
                                  case 0:
                                    ++o, t.label = 1;

                                  case 1:
                                    return t.trys.push([ 1, 4, , 5 ]), [ 4 /*yield*/ , u.Ls() ];

                                  case 2:
                                    // Wait for the transaction to complete (i.e. IndexedDb's onsuccess event to
                                    // fire), but still return the original transactionFnResult back to the
                                    // caller.
                                    return u.db = t.sent(), e = Jn.open(u.db, i ? "readonly" : "readwrite", n), s = r(e).catch((function(t) {
                                        // Abort the transaction if there was an error.
                                        return e.abort(t), Fn.reject(t);
                                    })).Sn(), a = {}, s.catch((function() {})), [ 4 /*yield*/ , e.Us ];

                                  case 3:
                                    return [ 2 /*return*/ , (a.value = (
                                    // Wait for the transaction to complete (i.e. IndexedDb's onsuccess event to
                                    // fire), but still return the original transactionFnResult back to the
                                    // caller.
                                    t.sent(), s), a) ];

                                  case 4:
                                    return c = t.sent(), f = "FirebaseError" !== c.name && o < 3, h("SimpleDb", "Transaction failed with error: %s. Retrying: %s.", c.message, f), 
                                    u.close(), f ? [ 3 /*break*/ , 5 ] : [ 2 /*return*/ , {
                                        value: Promise.reject(c)
                                    } ];

                                  case 5:
                                    return [ 2 /*return*/ ];
                                }
                            }));
                        }, u = this, c.label = 1;

                      case 1:
                        return [ 5 /*yield**/ , s() ];

                      case 2:
                        if ("object" == typeof (a = c.sent())) return [ 2 /*return*/ , a.value ];
                        c.label = 3;

                      case 3:
                        return [ 3 /*break*/ , 1 ];

                      case 4:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        }, e.prototype.close = function() {
            this.db && this.db.close(), this.db = void 0;
        }, e;
    }(), Zn = /** @class */ function() {
        function t(t) {
            this.Qs = t, this.Ws = !1, this.js = null;
        }
        return Object.defineProperty(t.prototype, "yn", {
            get: function() {
                return this.Ws;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "Ks", {
            get: function() {
                return this.js;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "cursor", {
            set: function(t) {
                this.Qs = t;
            },
            enumerable: !1,
            configurable: !0
        }), 
        /**
         * This function can be called to stop iteration at any point.
         */
        t.prototype.done = function() {
            this.Ws = !0;
        }, 
        /**
         * This function can be called to skip to that next key, which could be
         * an index or a primary key.
         */
        t.prototype.Gs = function(t) {
            this.js = t;
        }, 
        /**
         * Delete the current cursor value from the object store.
         *
         * NOTE: You CANNOT do this with a keysOnly query.
         */
        t.prototype.delete = function() {
            return er(this.Qs.delete());
        }, t;
    }(), Xn = /** @class */ function(e) {
        function n(t) {
            var n = this;
            return (n = e.call(this, D.UNAVAILABLE, "IndexedDB transaction failed: " + t) || this).name = "IndexedDbTransactionError", 
            n;
        }
        return t.__extends(n, e), n;
    }(x);

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A helper for running delayed tasks following an exponential backoff curve
     * between attempts.
     *
     * Each delay is made up of a "base" delay which follows the exponential
     * backoff curve, and a +/- 50% "jitter" that is calculated and added to the
     * base delay. This prevents clients from accidentally synchronizing their
     * delays causing spikes of load to the backend.
     */
    /** Verifies whether `e` is an IndexedDbTransactionError. */ function $n(t) {
        // Use name equality, as instanceof checks on errors don't work with errors
        // that wrap other errors.
        return "IndexedDbTransactionError" === t.name;
    }

    /**
     * Wraps an IDBTransaction and exposes a store() method to get a handle to a
     * specific object store.
     */ var Jn = /** @class */ function() {
        function t(t) {
            var e = this;
            this.transaction = t, this.aborted = !1, 
            /**
                 * A promise that resolves with the result of the IndexedDb transaction.
                 */
            this.zs = new Hn, this.transaction.oncomplete = function() {
                e.zs.resolve();
            }, this.transaction.onabort = function() {
                t.error ? e.zs.reject(new Xn(t.error)) : e.zs.resolve();
            }, this.transaction.onerror = function(t) {
                var n = rr(t.target.error);
                e.zs.reject(new Xn(n));
            };
        }
        return t.open = function(e, n, r) {
            try {
                return new t(e.transaction(r, n));
            } catch (e) {
                throw new Xn(e);
            }
        }, Object.defineProperty(t.prototype, "Us", {
            get: function() {
                return this.zs.promise;
            },
            enumerable: !1,
            configurable: !0
        }), t.prototype.abort = function(t) {
            t && this.zs.reject(t), this.aborted || (h("SimpleDb", "Aborting transaction:", t ? t.message : "Client-initiated abort"), 
            this.aborted = !0, this.transaction.abort());
        }, 
        /**
         * Returns a SimpleDbStore<KeyType, ValueType> for the specified store. All
         * operations performed on the SimpleDbStore happen within the context of this
         * transaction and it cannot be used anymore once the transaction is
         * completed.
         *
         * Note that we can't actually enforce that the KeyType and ValueType are
         * correct, but they allow type safety through the rest of the consuming code.
         */
        t.prototype.store = function(t) {
            var e = this.transaction.objectStore(t);
            return new tr(e);
        }, t;
    }(), tr = /** @class */ function() {
        function t(t) {
            this.store = t;
        }
        return t.prototype.put = function(t, e) {
            var n;
            return void 0 !== e ? (h("SimpleDb", "PUT", this.store.name, t, e), n = this.store.put(e, t)) : (h("SimpleDb", "PUT", this.store.name, "<auto-key>", t), 
            n = this.store.put(t)), er(n);
        }, 
        /**
         * Adds a new value into an Object Store and returns the new key. Similar to
         * IndexedDb's `add()`, this method will fail on primary key collisions.
         *
         * @param value The object to write.
         * @return The key of the value to add.
         */
        t.prototype.add = function(t) {
            return h("SimpleDb", "ADD", this.store.name, t, t), er(this.store.add(t));
        }, 
        /**
         * Gets the object with the specified key from the specified store, or null
         * if no object exists with the specified key.
         *
         * @key The key of the object to get.
         * @return The object with the specified key or null if no object exists.
         */
        t.prototype.get = function(t) {
            var e = this;
            // We're doing an unsafe cast to ValueType.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return er(this.store.get(t)).next((function(n) {
                // Normalize nonexistence to null.
                return void 0 === n && (n = null), h("SimpleDb", "GET", e.store.name, t, n), n;
            }));
        }, t.prototype.delete = function(t) {
            return h("SimpleDb", "DELETE", this.store.name, t), er(this.store.delete(t));
        }, 
        /**
         * If we ever need more of the count variants, we can add overloads. For now,
         * all we need is to count everything in a store.
         *
         * Returns the number of rows in the store.
         */
        t.prototype.count = function() {
            return h("SimpleDb", "COUNT", this.store.name), er(this.store.count());
        }, t.prototype.Hs = function(t, e) {
            var n = this.cursor(this.options(t, e)), r = [];
            return this.Ys(n, (function(t, e) {
                r.push(e);
            })).next((function() {
                return r;
            }));
        }, t.prototype.Js = function(t, e) {
            h("SimpleDb", "DELETE ALL", this.store.name);
            var n = this.options(t, e);
            n.Xs = !1;
            var r = this.cursor(n);
            return this.Ys(r, (function(t, e, n) {
                return n.delete();
            }));
        }, t.prototype.Zs = function(t, e) {
            var n;
            e ? n = t : (n = {}, e = t);
            var r = this.cursor(n);
            return this.Ys(r, e);
        }, 
        /**
         * Iterates over a store, but waits for the given callback to complete for
         * each entry before iterating the next entry. This allows the callback to do
         * asynchronous work to determine if this iteration should continue.
         *
         * The provided callback should return `true` to continue iteration, and
         * `false` otherwise.
         */
        t.prototype.ti = function(t) {
            var e = this.cursor({});
            return new Fn((function(n, r) {
                e.onerror = function(t) {
                    var e = rr(t.target.error);
                    r(e);
                }, e.onsuccess = function(e) {
                    var r = e.target.result;
                    r ? t(r.primaryKey, r.value).next((function(t) {
                        t ? r.continue() : n();
                    })) : n();
                };
            }));
        }, t.prototype.Ys = function(t, e) {
            var n = [];
            return new Fn((function(r, i) {
                t.onerror = function(t) {
                    i(t.target.error);
                }, t.onsuccess = function(t) {
                    var i = t.target.result;
                    if (i) {
                        var o = new Zn(i), s = e(i.primaryKey, i.value, o);
                        if (s instanceof Fn) {
                            var u = s.catch((function(t) {
                                return o.done(), Fn.reject(t);
                            }));
                            n.push(u);
                        }
                        o.yn ? r() : null === o.Ks ? i.continue() : i.continue(o.Ks);
                    } else r();
                };
            })).next((function() {
                return Fn.Cn(n);
            }));
        }, t.prototype.options = function(t, e) {
            var n = void 0;
            return void 0 !== t && ("string" == typeof t ? n = t : e = t), {
                index: n,
                range: e
            };
        }, t.prototype.cursor = function(t) {
            var e = "next";
            if (t.reverse && (e = "prev"), t.index) {
                var n = this.store.index(t.index);
                return t.Xs ? n.openKeyCursor(t.range, e) : n.openCursor(t.range, e);
            }
            return this.store.openCursor(t.range, e);
        }, t;
    }();

    /**
     * A wrapper around an IDBObjectStore providing an API that:
     *
     * 1) Has generic KeyType / ValueType parameters to provide strongly-typed
     * methods for acting against the object store.
     * 2) Deals with IndexedDB's onsuccess / onerror event callbacks, making every
     * method return a PersistencePromise instead.
     * 3) Provides a higher-level API to avoid needing to do excessive wrapping of
     * intermediate IndexedDB types (IDBCursorWithValue, etc.)
     */
    /**
     * Wraps an IDBRequest in a PersistencePromise, using the onsuccess / onerror
     * handlers to resolve / reject the PersistencePromise as appropriate.
     */
    function er(t) {
        return new Fn((function(e, n) {
            t.onsuccess = function(t) {
                var n = t.target.result;
                e(n);
            }, t.onerror = function(t) {
                var e = rr(t.target.error);
                n(e);
            };
        }));
    }

    // Guard so we only report the error once.
    var nr = !1;

    function rr(t) {
        var e = Yn.Fs(r.getUA());
        if (e >= 12.2 && e < 13) {
            var n = "An internal error was encountered in the Indexed Database server";
            if (t.message.indexOf(n) >= 0) {
                // Wrap error in a more descriptive one.
                var i = new x("internal", "IOS_INDEXEDDB_BUG1: IndexedDb has thrown '" + n + "'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.");
                return nr || (nr = !0, 
                // Throw a global exception outside of this promise chain, for the user to
                // potentially catch.
                setTimeout((function() {
                    throw i;
                }), 0)), i;
            }
        }
        return t;
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /** The Platform's 'window' implementation or null if not available. */ function ir() {
        // `window` is not always available, e.g. in ReactNative and WebWorkers.
        // eslint-disable-next-line no-restricted-globals
        return "undefined" != typeof window ? window : null;
    }

    /** The Platform's 'document' implementation or null if not available. */ function or() {
        // `document` is not always available, e.g. in ReactNative and WebWorkers.
        // eslint-disable-next-line no-restricted-globals
        return "undefined" != typeof document ? document : null;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Represents an operation scheduled to be run in the future on an AsyncQueue.
     *
     * It is created via DelayedOperation.createAndSchedule().
     *
     * Supports cancellation (via cancel()) and early execution (via skipDelay()).
     *
     * Note: We implement `PromiseLike` instead of `Promise`, as the `Promise` type
     * in newer versions of TypeScript defines `finally`, which is not available in
     * IE.
     */ var sr = /** @class */ function() {
        function t(t, e, n, r, i) {
            this.ei = t, this.ms = e, this.ni = n, this.op = r, this.si = i, this.ii = new Hn, 
            this.then = this.ii.promise.then.bind(this.ii.promise), 
            // It's normal for the deferred promise to be canceled (due to cancellation)
            // and so we attach a dummy catch callback to avoid
            // 'UnhandledPromiseRejectionWarning' log spam.
            this.ii.promise.catch((function(t) {}))
            /**
         * Creates and returns a DelayedOperation that has been scheduled to be
         * executed on the provided asyncQueue after the provided delayMs.
         *
         * @param asyncQueue The queue to schedule the operation on.
         * @param id A Timer ID identifying the type of operation this is.
         * @param delayMs The delay (ms) before the operation should be scheduled.
         * @param op The operation to run.
         * @param removalCallback A callback to be called synchronously once the
         *   operation is executed or canceled, notifying the AsyncQueue to remove it
         *   from its delayedOperations list.
         *   PORTING NOTE: This exists to prevent making removeDelayedOperation() and
         *   the DelayedOperation class public.
         */;
        }
        return t.ri = function(e, n, r, i, o) {
            var s = new t(e, n, Date.now() + r, i, o);
            return s.start(r), s;
        }, 
        /**
         * Starts the timer. This is called immediately after construction by
         * createAndSchedule().
         */
        t.prototype.start = function(t) {
            var e = this;
            this.oi = setTimeout((function() {
                return e.hi();
            }), t);
        }, 
        /**
         * Queues the operation to run immediately (if it hasn't already been run or
         * canceled).
         */
        t.prototype.Cs = function() {
            return this.hi();
        }, 
        /**
         * Cancels the operation if it hasn't already been executed or canceled. The
         * promise will be rejected.
         *
         * As long as the operation has not yet been run, calling cancel() provides a
         * guarantee that the operation will not be run.
         */
        t.prototype.cancel = function(t) {
            null !== this.oi && (this.clearTimeout(), this.ii.reject(new x(D.CANCELLED, "Operation cancelled" + (t ? ": " + t : ""))));
        }, t.prototype.hi = function() {
            var t = this;
            this.ei.ai((function() {
                return null !== t.oi ? (t.clearTimeout(), t.op().then((function(e) {
                    return t.ii.resolve(e);
                }))) : Promise.resolve();
            }));
        }, t.prototype.clearTimeout = function() {
            null !== this.oi && (this.si(this), clearTimeout(this.oi), this.oi = null);
        }, t;
    }(), ur = /** @class */ function() {
        function e() {
            var t = this;
            // The last promise in the queue.
                    this.ui = Promise.resolve(), 
            // A list of retryable operations. Retryable operations are run in order and
            // retried with backoff.
            this.ci = [], 
            // Is this AsyncQueue being shut down? Once it is set to true, it will not
            // be changed again.
            this.li = !1, 
            // Operations scheduled to be queued in the future. Operations are
            // automatically removed after they are run or canceled.
            this._i = [], 
            // visible for testing
            this.fi = null, 
            // Flag set while there's an outstanding AsyncQueue operation, used for
            // assertion sanity-checks.
            this.di = !1, 
            // List of TimerIds to fast-forward delays for.
            this.wi = [], 
            // Backoff timer used to schedule retries for retryable operations
            this.Ti = new Kn(this, "async_queue_retry" /* AsyncQueueRetry */), 
            // Visibility handler that triggers an immediate retry of all retryable
            // operations. Meant to speed up recovery when we regain file system access
            // after page comes into foreground.
            this.Ei = function() {
                var e = or();
                e && h("AsyncQueue", "Visibility state changed to  ", e.visibilityState), t.Ti.Ds();
            };
            var e = or();
            e && "function" == typeof e.addEventListener && e.addEventListener("visibilitychange", this.Ei);
        }
        return Object.defineProperty(e.prototype, "Ii", {
            // Is this AsyncQueue being shut down? If true, this instance will not enqueue
            // any new operations, Promises from enqueue requests will not resolve.
            get: function() {
                return this.li;
            },
            enumerable: !1,
            configurable: !0
        }), 
        /**
         * Adds a new operation to the queue without waiting for it to complete (i.e.
         * we ignore the Promise result).
         */
        e.prototype.ai = function(t) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.enqueue(t);
        }, 
        /**
         * Regardless if the queue has initialized shutdown, adds a new operation to the
         * queue without waiting for it to complete (i.e. we ignore the Promise result).
         */
        e.prototype.mi = function(t) {
            this.Ai(), 
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.Ri(t);
        }, 
        /**
         * Initialize the shutdown of this queue. Once this method is called, the
         * only possible way to request running an operation is through
         * `enqueueEvenWhileRestricted()`.
         */
        e.prototype.Pi = function() {
            if (!this.li) {
                this.li = !0;
                var t = or();
                t && "function" == typeof t.removeEventListener && t.removeEventListener("visibilitychange", this.Ei);
            }
        }, 
        /**
         * Adds a new operation to the queue. Returns a promise that will be resolved
         * when the promise returned by the new operation is (with its value).
         */
        e.prototype.enqueue = function(t) {
            return this.Ai(), this.li ? new Promise((function(t) {})) : this.Ri(t);
        }, 
        /**
         * Enqueue a retryable operation.
         *
         * A retryable operation is rescheduled with backoff if it fails with a
         * IndexedDbTransactionError (the error type used by SimpleDb). All
         * retryable operations are executed in order and only run if all prior
         * operations were retried successfully.
         */
        e.prototype.gi = function(t) {
            var e = this;
            this.ci.push(t), this.ai((function() {
                return e.Vi();
            }));
        }, 
        /**
         * Runs the next operation from the retryable queue. If the operation fails,
         * reschedules with backoff.
         */
        e.prototype.Vi = function() {
            return t.__awaiter(this, void 0, void 0, (function() {
                var e, n = this;
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        if (0 === this.ci.length) return [ 3 /*break*/ , 5 ];
                        t.label = 1;

                      case 1:
                        return t.trys.push([ 1, 3, , 4 ]), [ 4 /*yield*/ , this.ci[0]() ];

                      case 2:
                        return t.sent(), this.ci.shift(), this.Ti.reset(), [ 3 /*break*/ , 4 ];

                      case 3:
                        if (!$n(e = t.sent())) throw e;
                        // Failure will be handled by AsyncQueue
                                            return h("AsyncQueue", "Operation failed with retryable error: " + e), 
                        [ 3 /*break*/ , 4 ];

                      case 4:
                        this.ci.length > 0 && 
                        // If there are additional operations, we re-schedule `retryNextOp()`.
                        // This is necessary to run retryable operations that failed during
                        // their initial attempt since we don't know whether they are already
                        // enqueued. If, for example, `op1`, `op2`, `op3` are enqueued and `op1`
                        // needs to  be re-run, we will run `op1`, `op1`, `op2` using the
                        // already enqueued calls to `retryNextOp()`. `op3()` will then run in the
                        // call scheduled here.
                        // Since `backoffAndRun()` cancels an existing backoff and schedules a
                        // new backoff on every call, there is only ever a single additional
                        // operation in the queue.
                        this.Ti.bs((function() {
                            return n.Vi();
                        })), t.label = 5;

                      case 5:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        }, e.prototype.Ri = function(t) {
            var e = this, n = this.ui.then((function() {
                return e.di = !0, t().catch((function(t) {
                    // Re-throw the error so that this.tail becomes a rejected Promise and
                    // all further attempts to chain (via .then) will just short-circuit
                    // and return the rejected Promise.
                    throw e.fi = t, e.di = !1, f("INTERNAL UNHANDLED ERROR: ", 
                    /**
     * Chrome includes Error.message in Error.stack. Other browsers do not.
     * This returns expected output of message + stack when available.
     * @param error Error or FirestoreError
     */
                    function(t) {
                        var e = t.message || "";
                        return t.stack && (e = t.stack.includes(t.message) ? t.stack : t.message + "\n" + t.stack), 
                        e;
                    }(t)), t;
                })).then((function(t) {
                    return e.di = !1, t;
                }));
            }));
            return this.ui = n, n;
        }, 
        /**
         * Schedules an operation to be queued on the AsyncQueue once the specified
         * `delayMs` has elapsed. The returned DelayedOperation can be used to cancel
         * or fast-forward the operation prior to its running.
         */
        e.prototype.Ss = function(t, e, n) {
            var r = this;
            this.Ai(), 
            // Fast-forward delays for timerIds that have been overriden.
            this.wi.indexOf(t) > -1 && (e = 0);
            var i = sr.ri(this, t, e, n, (function(t) {
                return r.yi(t);
            }));
            return this._i.push(i), i;
        }, e.prototype.Ai = function() {
            this.fi && d();
        }, 
        /**
         * Verifies there's an operation currently in-progress on the AsyncQueue.
         * Unfortunately we can't verify that the running code is in the promise chain
         * of that operation, so this isn't a foolproof check, but it should be enough
         * to catch some bugs.
         */
        e.prototype.pi = function() {}, 
        /**
         * Waits until all currently queued tasks are finished executing. Delayed
         * operations are not run.
         */
        e.prototype.bi = function() {
            return t.__awaiter(this, void 0, void 0, (function() {
                var e;
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        return [ 4 /*yield*/ , e = this.ui ];

                      case 1:
                        t.sent(), t.label = 2;

                      case 2:
                        if (e !== this.ui) return [ 3 /*break*/ , 0 ];
                        t.label = 3;

                      case 3:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        }, 
        /**
         * For Tests: Determine if a delayed operation with a particular TimerId
         * exists.
         */
        e.prototype.vi = function(t) {
            for (var e = 0, n = this._i; e < n.length; e++) {
                if (n[e].ms === t) return !0;
            }
            return !1;
        }, 
        /**
         * For Tests: Runs some or all delayed operations early.
         *
         * @param lastTimerId Delayed operations up to and including this TimerId will
         *  be drained. Pass TimerId.All to run all delayed operations.
         * @returns a Promise that resolves once all operations have been run.
         */
        e.prototype.Si = function(t) {
            var e = this;
            // Note that draining may generate more delayed ops, so we do that first.
                    return this.bi().then((function() {
                // Run ops in the same order they'd run if they ran naturally.
                e._i.sort((function(t, e) {
                    return t.ni - e.ni;
                }));
                for (var n = 0, r = e._i; n < r.length; n++) {
                    var i = r[n];
                    if (i.Cs(), "all" /* All */ !== t && i.ms === t) break;
                }
                return e.bi();
            }));
        }, 
        /**
         * For Tests: Skip all subsequent delays for a timer id.
         */
        e.prototype.Di = function(t) {
            this.wi.push(t);
        }, 
        /** Called once a DelayedOperation is run or canceled. */ e.prototype.yi = function(t) {
            // NOTE: indexOf / slice are O(n), but delayedOperations is expected to be small.
            var e = this._i.indexOf(t);
            this._i.splice(e, 1);
        }, e;
    }();

    /**
     * Returns a FirestoreError that can be surfaced to the user if the provided
     * error is an IndexedDbTransactionError. Re-throws the error otherwise.
     */
    function ar(t, e) {
        if (f("AsyncQueue", e + ": " + t), $n(t)) return new x(D.UNAVAILABLE, e + ": " + t);
        throw t;
    }

    function cr(t, e) {
        var n = t[0], r = t[1], i = e[0], o = e[1], s = w(n, i);
        return 0 === s ? w(r, o) : s;
    }

    /**
     * Used to calculate the nth sequence number. Keeps a rolling buffer of the
     * lowest n values passed to `addElement`, and finally reports the largest of
     * them in `maxValue`.
     */ var hr = /** @class */ function() {
        function t(t) {
            this.Ci = t, this.buffer = new et(cr), this.Ni = 0;
        }
        return t.prototype.Fi = function() {
            return ++this.Ni;
        }, t.prototype.ki = function(t) {
            var e = [ t, this.Fi() ];
            if (this.buffer.size < this.Ci) this.buffer = this.buffer.add(e); else {
                var n = this.buffer.last();
                cr(e, n) < 0 && (this.buffer = this.buffer.delete(n).add(e));
            }
        }, Object.defineProperty(t.prototype, "maxValue", {
            get: function() {
                // Guaranteed to be non-empty. If we decide we are not collecting any
                // sequence numbers, nthSequenceNumber below short-circuits. If we have
                // decided that we are collecting n sequence numbers, it's because n is some
                // percentage of the existing sequence numbers. That means we should never
                // be in a situation where we are collecting sequence numbers but don't
                // actually have any.
                return this.buffer.last()[0];
            },
            enumerable: !1,
            configurable: !0
        }), t;
    }(), fr = {
        $i: !1,
        xi: 0,
        Oi: 0,
        Mi: 0
    }, lr = /** @class */ function() {
        function t(
        // When we attempt to collect, we will only do so if the cache size is greater than this
        // threshold. Passing `COLLECTION_DISABLED` here will cause collection to always be skipped.
        t, 
        // The percentage of sequence numbers that we will attempt to collect
        e, 
        // A cap on the total number of sequence numbers that will be collected. This prevents
        // us from collecting a huge number of sequence numbers if the cache has grown very large.
        n) {
            this.Li = t, this.qi = e, this.Bi = n;
        }
        return t.Ui = function(e) {
            return new t(e, t.Qi, t.Wi);
        }, t;
    }();

    lr.ji = -1, lr.Ki = 1048576, lr.Gi = 41943040, lr.Qi = 10, lr.Wi = 1e3, lr.zi = new lr(lr.Gi, lr.Qi, lr.Wi), 
    lr.Hi = new lr(lr.ji, 0, 0);

    /**
     * This class is responsible for the scheduling of LRU garbage collection. It handles checking
     * whether or not GC is enabled, as well as which delay to use before the next run.
     */
    var pr = /** @class */ function() {
        function e(t, e) {
            this.Yi = t, this.ei = e, this.Ji = !1, this.Xi = null;
        }
        return e.prototype.start = function(t) {
            this.Yi.params.Li !== lr.ji && this.Zi(t);
        }, e.prototype.stop = function() {
            this.Xi && (this.Xi.cancel(), this.Xi = null);
        }, Object.defineProperty(e.prototype, "tr", {
            get: function() {
                return null !== this.Xi;
            },
            enumerable: !1,
            configurable: !0
        }), e.prototype.Zi = function(e) {
            var n = this, r = this.Ji ? 3e5 : 6e4;
            h("LruGarbageCollector", "Garbage collection scheduled in " + r + "ms"), this.Xi = this.ei.Ss("lru_garbage_collection" /* LruGarbageCollection */ , r, (function() {
                return t.__awaiter(n, void 0, void 0, (function() {
                    var n;
                    return t.__generator(this, (function(t) {
                        switch (t.label) {
                          case 0:
                            this.Xi = null, this.Ji = !0, t.label = 1;

                          case 1:
                            return t.trys.push([ 1, 3, , 7 ]), [ 4 /*yield*/ , e.er(this.Yi) ];

                          case 2:
                            return t.sent(), [ 3 /*break*/ , 7 ];

                          case 3:
                            return $n(n = t.sent()) ? (h("LruGarbageCollector", "Ignoring IndexedDB error during garbage collection: ", n), 
                            [ 3 /*break*/ , 6 ]) : [ 3 /*break*/ , 4 ];

                          case 4:
                            return [ 4 /*yield*/ , xi(n) ];

                          case 5:
                            t.sent(), t.label = 6;

                          case 6:
                            return [ 3 /*break*/ , 7 ];

                          case 7:
                            return [ 4 /*yield*/ , this.Zi(e) ];

                          case 8:
                            return t.sent(), [ 2 /*return*/ ];
                        }
                    }));
                }));
            }));
        }, e;
    }(), dr = /** @class */ function() {
        function t(t, e) {
            this.nr = t, this.params = e
            /** Given a percentile of target to collect, returns the number of targets to collect. */;
        }
        return t.prototype.sr = function(t, e) {
            return this.nr.ir(t).next((function(t) {
                return Math.floor(e / 100 * t);
            }));
        }, 
        /** Returns the nth sequence number, counting in order from the smallest. */ t.prototype.rr = function(t, e) {
            var n = this;
            if (0 === e) return Fn.resolve(Wn.Es);
            var r = new hr(e);
            return this.nr.be(t, (function(t) {
                return r.ki(t.sequenceNumber);
            })).next((function() {
                return n.nr.or(t, (function(t) {
                    return r.ki(t);
                }));
            })).next((function() {
                return r.maxValue;
            }));
        }, 
        /**
         * Removes targets with a sequence number equal to or less than the given upper bound, and removes
         * document associations with those targets.
         */
        t.prototype.hr = function(t, e, n) {
            return this.nr.hr(t, e, n);
        }, 
        /**
         * Removes documents that have a sequence number equal to or less than the upper bound and are not
         * otherwise pinned.
         */
        t.prototype.ar = function(t, e) {
            return this.nr.ar(t, e);
        }, t.prototype.ur = function(t, e) {
            var n = this;
            return this.params.Li === lr.ji ? (h("LruGarbageCollector", "Garbage collection skipped; disabled"), 
            Fn.resolve(fr)) : this.cr(t).next((function(r) {
                return r < n.params.Li ? (h("LruGarbageCollector", "Garbage collection skipped; Cache size " + r + " is lower than threshold " + n.params.Li), 
                fr) : n.lr(t, e);
            }));
        }, t.prototype.cr = function(t) {
            return this.nr.cr(t);
        }, t.prototype.lr = function(t, e) {
            var r, i, o, s, u, a, f, l = this, p = Date.now();
            return this.sr(t, this.params.qi).next((function(e) {
                // Cap at the configured max
                return e > l.params.Bi ? (h("LruGarbageCollector", "Capping sequence numbers to collect down to the maximum of " + l.params.Bi + " from " + e), 
                i = l.params.Bi) : i = e, s = Date.now(), l.rr(t, i);
            })).next((function(n) {
                return r = n, u = Date.now(), l.hr(t, r, e);
            })).next((function(e) {
                return o = e, a = Date.now(), l.ar(t, r);
            })).next((function(t) {
                return f = Date.now(), c() <= n.LogLevel.DEBUG && h("LruGarbageCollector", "LRU Garbage Collection\n\tCounted targets in " + (s - p) + "ms\n\tDetermined least recently used " + i + " in " + (u - s) + "ms\n\tRemoved " + o + " targets in " + (a - u) + "ms\n\tRemoved " + t + " documents in " + (f - a) + "ms\nTotal Duration: " + (f - p) + "ms"), 
                Fn.resolve({
                    $i: !0,
                    xi: i,
                    Oi: o,
                    Mi: t
                });
            }));
        }, t;
    }();

    /** Implements the steps for LRU garbage collection. */
    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Encodes a resource path into a IndexedDb-compatible string form.
     */
    function yr(t) {
        for (var e = "", n = 0; n < t.length; n++) e.length > 0 && (e = gr(e)), e = vr(t.get(n), e);
        return gr(e);
    }

    /** Encodes a single segment of a resource path into the given result */ function vr(t, e) {
        for (var n = e, r = t.length, i = 0; i < r; i++) {
            var o = t.charAt(i);
            switch (o) {
              case "\0":
                n += "";
                break;

              case "":
                n += "";
                break;

              default:
                n += o;
            }
        }
        return n;
    }

    /** Encodes a path separator into the given result */ function gr(t) {
        return t + "";
    }

    /**
     * Decodes the given IndexedDb-compatible string form of a resource path into
     * a ResourcePath instance. Note that this method is not suitable for use with
     * decoding resource names from the server; those are One Platform format
     * strings.
     */ function mr(t) {
        // Event the empty path must encode as a path of at least length 2. A path
        // with exactly 2 must be the empty path.
        var e = t.length;
        if (y(e >= 2), 2 === e) return y("" === t.charAt(0) && "" === t.charAt(1)), P.$();
        // Escape characters cannot exist past the second-to-last position in the
        // source value.
            for (var n = e - 2, r = [], i = "", o = 0; o < e; ) {
            // The last two characters of a valid encoded path must be a separator, so
            // there must be an end to this segment.
            var s = t.indexOf("", o);
            switch ((s < 0 || s > n) && d(), t.charAt(s + 1)) {
              case "":
                var u = t.substring(o, s), a = void 0;
                0 === i.length ? 
                // Avoid copying for the common case of a segment that excludes \0
                // and \001
                a = u : (a = i += u, i = ""), r.push(a);
                break;

              case "":
                i += t.substring(o, s), i += "\0";
                break;

              case "":
                // The escape character can be used in the output to encode itself.
                i += t.substring(o, s + 1);
                break;

              default:
                d();
            }
            o = s + 2;
        }
        return new P(r);
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /** Serializer for values stored in the LocalStore. */ var wr = function(t) {
        this._r = t;
    };

    /** Decodes a remote document from storage locally to a Document. */ function br(t, e) {
        if (e.document) return function(t, e, n) {
            var r = ne(t, e.name), i = $t(e.updateTime), o = new Je({
                mapValue: {
                    fields: e.fields
                }
            });
            return new rn(r, i, o, {
                hasCommittedMutations: !!n
            });
        }(t._r, e.document, !!e.hasCommittedMutations);
        if (e.noDocument) {
            var n = U.K(e.noDocument.path), r = Nr(e.noDocument.readTime);
            return new on(n, r, {
                hasCommittedMutations: !!e.hasCommittedMutations
            });
        }
        if (e.unknownDocument) {
            var i = U.K(e.unknownDocument.path), o = Nr(e.unknownDocument.version);
            return new sn(i, o);
        }
        return d();
    }

    /** Encodes a document for storage locally. */ function _r(t, e, n) {
        var r = Ir(n), i = e.key.path.p().N();
        if (e instanceof rn) {
            var o = function(t, e) {
                return {
                    name: ee(t, e.key),
                    fields: e.tn().mapValue.fields,
                    updateTime: Yt(t, e.version.A())
                };
            }(t._r, e), s = e.hasCommittedMutations;
            return new Zr(
            /* unknownDocument= */ null, 
            /* noDocument= */ null, o, s, r, i);
        }
        if (e instanceof on) {
            var u = e.key.path.N(), a = Tr(e.version), c = e.hasCommittedMutations;
            return new Zr(
            /* unknownDocument= */ null, new Kr(u, a), 
            /* document= */ null, c, r, i);
        }
        if (e instanceof sn) {
            var h = e.key.path.N(), f = Tr(e.version);
            return new Zr(new Yr(h, f), 
            /* noDocument= */ null, 
            /* document= */ null, 
            /* hasCommittedMutations= */ !0, r, i);
        }
        return d();
    }

    function Ir(t) {
        var e = t.A();
        return [ e.seconds, e.nanoseconds ];
    }

    function Er(t) {
        var e = new k(t[0], t[1]);
        return L.I(e);
    }

    function Tr(t) {
        var e = t.A();
        return new Br(e.seconds, e.nanoseconds);
    }

    function Nr(t) {
        var e = new k(t.seconds, t.nanoseconds);
        return L.I(e);
    }

    /** Encodes a batch of mutations into a DbMutationBatch for local storage. */
    /** Decodes a DbMutationBatch into a MutationBatch */ function Ar(t, e) {
        var n = (e.baseMutations || []).map((function(e) {
            return ce(t._r, e);
        })), r = e.mutations.map((function(e) {
            return ce(t._r, e);
        })), i = k.fromMillis(e.localWriteTimeMs);
        return new qn(e.batchId, i, n, r);
    }

    /** Decodes a DbTarget into TargetData */ function Sr(t) {
        var e, n, r = Nr(t.readTime), i = void 0 !== t.lastLimboFreeSnapshotVersion ? Nr(t.lastLimboFreeSnapshotVersion) : L.min();
        return void 0 !== t.query.documents ? (y(1 === (n = t.query).documents.length), 
        e = pn(hn(ie(n.documents[0])))) : e = function(t) {
            var e = ie(t.parent), n = t.structuredQuery, r = n.from ? n.from.length : 0, i = null;
            if (r > 0) {
                y(1 === r);
                var o = n.from[0];
                o.allDescendants ? i = o.collectionId : e = e.child(o.collectionId);
            }
            var s = [];
            n.where && (s = function t(e) {
                return e ? void 0 !== e.unaryFilter ? [ we(e) ] : void 0 !== e.fieldFilter ? [ me(e) ] : void 0 !== e.compositeFilter ? e.compositeFilter.filters.map((function(e) {
                    return t(e);
                })).reduce((function(t, e) {
                    return t.concat(e);
                })) : d() : [];
            }(n.where));
            var u = [];
            n.orderBy && (u = n.orderBy.map((function(t) {
                return function(t) {
                    return new Vn(ge(t.field), 
                    // visible for testing
                    function(t) {
                        switch (t) {
                          case "ASCENDING":
                            return "asc" /* ASCENDING */;

                          case "DESCENDING":
                            return "desc" /* DESCENDING */;

                          default:
                            return;
                        }
                    }(t.direction));
                }(t);
            })));
            var a = null;
            n.limit && (a = function(t) {
                var e;
                return C(e = "object" == typeof t ? t.value : t) ? null : e;
            }(n.limit));
            var c = null;
            n.startAt && (c = pe(n.startAt));
            var h = null;
            return n.endAt && (h = pe(n.endAt)), pn(cn(e, i, u, s, a, "F" /* First */ , c, h));
        }(t.query), new K(e, t.targetId, 0 /* Listen */ , t.lastListenSequenceNumber, r, i, Q.fromBase64String(t.resumeToken))
        /** Encodes TargetData into a DbTarget for storage locally. */;
    }

    function Dr(t, e) {
        var n, r = Tr(e.Z), i = Tr(e.lastLimboFreeSnapshotVersion);
        n = z(e.target) ? he(t._r, e.target) : fe(t._r, e.target);
        // We can't store the resumeToken as a ByteString in IndexedDb, so we
        // convert it to a base64 string for storage.
        var o = e.resumeToken.toBase64();
        // lastListenSequenceNumber is always 0 until we do real GC.
            return new $r(e.targetId, j(e.target), r, o, e.sequenceNumber, i, n);
    }

    /**
     * A helper function for figuring out what kind of query has been stored.
     */
    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /** A mutation queue for a specific user, backed by IndexedDB. */ var xr = /** @class */ function() {
        function t(
        /**
         * The normalized userId (e.g. null UID => "" userId) used to store /
         * retrieve mutations.
         */
        t, e, n, r) {
            this.userId = t, this.serializer = e, this.zn = n, this.dr = r, 
            /**
                 * Caches the document keys for pending mutation batches. If the mutation
                 * has been removed from IndexedDb, the cached value may continue to
                 * be used to retrieve the batch's document keys. To remove a cached value
                 * locally, `removeCachedMutationKeys()` should be invoked either directly
                 * or through `removeMutationBatches()`.
                 *
                 * With multi-tab, when the primary client acknowledges or rejects a mutation,
                 * this cache is used by secondary clients to invalidate the local
                 * view of the documents that were previously affected by the mutation.
                 */
            // PORTING NOTE: Multi-tab only.
            this.wr = {}
            /**
         * Creates a new mutation queue for the given user.
         * @param user The user for which to create a mutation queue.
         * @param serializer The serializer to use when persisting to IndexedDb.
         */;
        }
        return t.Tr = function(e, n, r, i) {
            // TODO(mcg): Figure out what constraints there are on userIDs
            // In particular, are there any reserved characters? are empty ids allowed?
            // For the moment store these together in the same mutations table assuming
            // that empty userIDs aren't allowed.
            return y("" !== e.uid), new t(e.Er() ? e.uid : "", n, r, i);
        }, t.prototype.Ir = function(t) {
            var e = !0, n = IDBKeyRange.bound([ this.userId, Number.NEGATIVE_INFINITY ], [ this.userId, Number.POSITIVE_INFINITY ]);
            return Rr(t).Zs({
                index: Wr.userMutationsIndex,
                range: n
            }, (function(t, n, r) {
                e = !1, r.done();
            })).next((function() {
                return e;
            }));
        }, t.prototype.mr = function(t, e, n, r) {
            var i = this, o = Pr(t), s = Rr(t);
            // The IndexedDb implementation in Chrome (and Firefox) does not handle
            // compound indices that include auto-generated keys correctly. To ensure
            // that the index entry is added correctly in all browsers, we perform two
            // writes: The first write is used to retrieve the next auto-generated Batch
            // ID, and the second write populates the index and stores the actual
            // mutation batch.
            // See: https://bugs.chromium.org/p/chromium/issues/detail?id=701972
            // We write an empty object to obtain key
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return s.add({}).next((function(u) {
                y("number" == typeof u);
                for (var a = new qn(u, e, n, r), c = function(t, e, n) {
                    var r = n.baseMutations.map((function(e) {
                        return ae(t._r, e);
                    })), i = n.mutations.map((function(e) {
                        return ae(t._r, e);
                    }));
                    return new Wr(e, n.batchId, n.Tn.toMillis(), r, i);
                }(i.serializer, i.userId, a), h = [], f = new et((function(t, e) {
                    return w(t.F(), e.F());
                })), l = 0, p = r; l < p.length; l++) {
                    var d = p[l], v = Hr.key(i.userId, d.key.path, u);
                    f = f.add(d.key.path.p()), h.push(s.put(c)), h.push(o.put(v, Hr.PLACEHOLDER));
                }
                return f.forEach((function(e) {
                    h.push(i.zn.Ar(t, e));
                })), t.Wn((function() {
                    i.wr[u] = a.keys();
                })), Fn.Cn(h).next((function() {
                    return a;
                }));
            }));
        }, t.prototype.Rr = function(t, e) {
            var n = this;
            return Rr(t).get(e).next((function(t) {
                return t ? (y(t.userId === n.userId), Ar(n.serializer, t)) : null;
            }));
        }, 
        /**
         * Returns the document keys for the mutation batch with the given batchId.
         * For primary clients, this method returns `null` after
         * `removeMutationBatches()` has been called. Secondary clients return a
         * cached result until `removeCachedMutationKeys()` is invoked.
         */
        // PORTING NOTE: Multi-tab only.
        t.prototype.Pr = function(t, e) {
            var n = this;
            return this.wr[e] ? Fn.resolve(this.wr[e]) : this.Rr(t, e).next((function(t) {
                if (t) {
                    var r = t.keys();
                    return n.wr[e] = r, r;
                }
                return null;
            }));
        }, t.prototype.gr = function(t, e) {
            var n = this, r = e + 1, i = IDBKeyRange.lowerBound([ this.userId, r ]), o = null;
            return Rr(t).Zs({
                index: Wr.userMutationsIndex,
                range: i
            }, (function(t, e, i) {
                e.userId === n.userId && (y(e.batchId >= r), o = Ar(n.serializer, e)), i.done();
            })).next((function() {
                return o;
            }));
        }, t.prototype.Vr = function(t) {
            var e = IDBKeyRange.upperBound([ this.userId, Number.POSITIVE_INFINITY ]), n = -1;
            return Rr(t).Zs({
                index: Wr.userMutationsIndex,
                range: e,
                reverse: !0
            }, (function(t, e, r) {
                n = e.batchId, r.done();
            })).next((function() {
                return n;
            }));
        }, t.prototype.yr = function(t) {
            var e = this, n = IDBKeyRange.bound([ this.userId, -1 ], [ this.userId, Number.POSITIVE_INFINITY ]);
            return Rr(t).Hs(Wr.userMutationsIndex, n).next((function(t) {
                return t.map((function(t) {
                    return Ar(e.serializer, t);
                }));
            }));
        }, t.prototype.Yn = function(t, e) {
            var n = this, r = Hr.prefixForPath(this.userId, e.path), i = IDBKeyRange.lowerBound(r), o = [];
            // Scan the document-mutation index starting with a prefix starting with
            // the given documentKey.
                    return Pr(t).Zs({
                range: i
            }, (function(r, i, s) {
                var u = r[0], a = r[1], c = r[2], h = mr(a);
                // Only consider rows matching exactly the specific key of
                // interest. Note that because we order by path first, and we
                // order terminators before path separators, we'll encounter all
                // the index rows for documentKey contiguously. In particular, all
                // the rows for documentKey will occur before any rows for
                // documents nested in a subcollection beneath documentKey so we
                // can stop as soon as we hit any such row.
                            if (u === n.userId && e.path.isEqual(h)) 
                // Look up the mutation batch in the store.
                return Rr(t).get(c).next((function(t) {
                    if (!t) throw d();
                    y(t.userId === n.userId), o.push(Ar(n.serializer, t));
                }));
                s.done();
            })).next((function() {
                return o;
            }));
        }, t.prototype.es = function(t, e) {
            var n = this, r = new et(w), i = [];
            return e.forEach((function(e) {
                var o = Hr.prefixForPath(n.userId, e.path), s = IDBKeyRange.lowerBound(o), u = Pr(t).Zs({
                    range: s
                }, (function(t, i, o) {
                    var s = t[0], u = t[1], a = t[2], c = mr(u);
                    // Only consider rows matching exactly the specific key of
                    // interest. Note that because we order by path first, and we
                    // order terminators before path separators, we'll encounter all
                    // the index rows for documentKey contiguously. In particular, all
                    // the rows for documentKey will occur before any rows for
                    // documents nested in a subcollection beneath documentKey so we
                    // can stop as soon as we hit any such row.
                                    s === n.userId && e.path.isEqual(c) ? r = r.add(a) : o.done();
                }));
                i.push(u);
            })), Fn.Cn(i).next((function() {
                return n.pr(t, r);
            }));
        }, t.prototype.as = function(t, e) {
            var n = this, r = e.path, i = r.length + 1, o = Hr.prefixForPath(this.userId, r), s = IDBKeyRange.lowerBound(o), u = new et(w);
            return Pr(t).Zs({
                range: s
            }, (function(t, e, o) {
                var s = t[0], a = t[1], c = t[2], h = mr(a);
                s === n.userId && r.D(h) ? 
                // Rows with document keys more than one segment longer than the
                // query path can't be matches. For example, a query on 'rooms'
                // can't match the document /rooms/abc/messages/xyx.
                // TODO(mcg): we'll need a different scanner when we implement
                // ancestor queries.
                h.length === i && (u = u.add(c)) : o.done();
            })).next((function() {
                return n.pr(t, u);
            }));
        }, t.prototype.pr = function(t, e) {
            var n = this, r = [], i = [];
            // TODO(rockwood): Implement this using iterate.
            return e.forEach((function(e) {
                i.push(Rr(t).get(e).next((function(t) {
                    if (null === t) throw d();
                    y(t.userId === n.userId), r.push(Ar(n.serializer, t));
                })));
            })), Fn.Cn(i).next((function() {
                return r;
            }));
        }, t.prototype.br = function(t, e) {
            var n = this;
            return Lr(t.vr, this.userId, e).next((function(r) {
                return t.Wn((function() {
                    n.Sr(e.batchId);
                })), Fn.forEach(r, (function(e) {
                    return n.dr.Dr(t, e);
                }));
            }));
        }, 
        /**
         * Clears the cached keys for a mutation batch. This method should be
         * called by secondary clients after they process mutation updates.
         *
         * Note that this method does not have to be called from primary clients as
         * the corresponding cache entries are cleared when an acknowledged or
         * rejected batch is removed from the mutation queue.
         */
        // PORTING NOTE: Multi-tab only
        t.prototype.Sr = function(t) {
            delete this.wr[t];
        }, t.prototype.Cr = function(t) {
            var e = this;
            return this.Ir(t).next((function(n) {
                if (!n) return Fn.resolve();
                // Verify that there are no entries in the documentMutations index if
                // the queue is empty.
                            var r = IDBKeyRange.lowerBound(Hr.prefixForUser(e.userId)), i = [];
                return Pr(t).Zs({
                    range: r
                }, (function(t, n, r) {
                    if (t[0] === e.userId) {
                        var o = mr(t[1]);
                        i.push(o);
                    } else r.done();
                })).next((function() {
                    y(0 === i.length);
                }));
            }));
        }, t.prototype.Nr = function(t, e) {
            return kr(t, this.userId, e);
        }, 
        // PORTING NOTE: Multi-tab only (state is held in memory in other clients).
        /** Returns the mutation queue's metadata from IndexedDb. */
        t.prototype.Fr = function(t) {
            var e = this;
            return Or(t).get(this.userId).next((function(t) {
                return t || new Qr(e.userId, -1, 
                /*lastStreamToken=*/ "");
            }));
        }, t;
    }();

    /**
     * @return true if the mutation queue for the given user contains a pending
     *         mutation for the given key.
     */ function kr(t, e, n) {
        var r = Hr.prefixForPath(e, n.path), i = r[1], o = IDBKeyRange.lowerBound(r), s = !1;
        return Pr(t).Zs({
            range: o,
            Xs: !0
        }, (function(t, n, r) {
            var o = t[0], u = t[1];
            t[2];
            o === e && u === i && (s = !0), r.done();
        })).next((function() {
            return s;
        }));
    }

    /** Returns true if any mutation queue contains the given document. */
    /**
     * Delete a mutation batch and the associated document mutations.
     * @return A PersistencePromise of the document mutations that were removed.
     */ function Lr(t, e, n) {
        var r = t.store(Wr.store), i = t.store(Hr.store), o = [], s = IDBKeyRange.only(n.batchId), u = 0, a = r.Zs({
            range: s
        }, (function(t, e, n) {
            return u++, n.delete();
        }));
        o.push(a.next((function() {
            y(1 === u);
        })));
        for (var c = [], h = 0, f = n.mutations; h < f.length; h++) {
            var l = f[h], p = Hr.key(e, l.key.path, n.batchId);
            o.push(i.delete(p)), c.push(l.key);
        }
        return Fn.Cn(o).next((function() {
            return c;
        }));
    }

    /**
     * Helper to get a typed SimpleDbStore for the mutations object store.
     */ function Rr(t) {
        return di.Ms(t, Wr.store);
    }

    /**
     * Helper to get a typed SimpleDbStore for the mutationQueues object store.
     */ function Pr(t) {
        return di.Ms(t, Hr.store);
    }

    /**
     * Helper to get a typed SimpleDbStore for the mutationQueues object store.
     */ function Or(t) {
        return di.Ms(t, Qr.store);
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ var Vr = /** @class */ function() {
        /**
         * @param {LocalSerializer} serializer The document serializer.
         * @param {IndexManager} indexManager The query indexes that need to be maintained.
         */
        function t(t, e) {
            this.serializer = t, this.zn = e
            /**
         * Adds the supplied entries to the cache.
         *
         * All calls of `addEntry` are required to go through the RemoteDocumentChangeBuffer
         * returned by `newChangeBuffer()` to ensure proper accounting of metadata.
         */;
        }
        return t.prototype.xn = function(t, e, n) {
            return Cr(t).put(qr(e), n);
        }, 
        /**
         * Removes a document from the cache.
         *
         * All calls of `removeEntry`  are required to go through the RemoteDocumentChangeBuffer
         * returned by `newChangeBuffer()` to ensure proper accounting of metadata.
         */
        t.prototype.Mn = function(t, e) {
            var n = Cr(t), r = qr(e);
            return n.delete(r);
        }, 
        /**
         * Updates the current cache size.
         *
         * Callers to `addEntry()` and `removeEntry()` *must* call this afterwards to update the
         * cache's metadata.
         */
        t.prototype.updateMetadata = function(t, e) {
            var n = this;
            return this.getMetadata(t).next((function(r) {
                return r.byteSize += e, n.kr(t, r);
            }));
        }, t.prototype.Ln = function(t, e) {
            var n = this;
            return Cr(t).get(qr(e)).next((function(t) {
                return n.$r(t);
            }));
        }, 
        /**
         * Looks up an entry in the cache.
         *
         * @param documentKey The key of the entry to look up.
         * @return The cached MaybeDocument entry and its size, or null if we have nothing cached.
         */
        t.prototype.xr = function(t, e) {
            var n = this;
            return Cr(t).get(qr(e)).next((function(t) {
                var e = n.$r(t);
                return e ? {
                    Or: e,
                    size: Mr(t)
                } : null;
            }));
        }, t.prototype.getEntries = function(t, e) {
            var n = this, r = ot();
            return this.Mr(t, e, (function(t, e) {
                var i = n.$r(e);
                r = r.st(t, i);
            })).next((function() {
                return r;
            }));
        }, 
        /**
         * Looks up several entries in the cache.
         *
         * @param documentKeys The set of keys entries to look up.
         * @return A map of MaybeDocuments indexed by key (if a document cannot be
         *     found, the key will be mapped to null) and a map of sizes indexed by
         *     key (zero if the key cannot be found).
         */
        t.prototype.Lr = function(t, e) {
            var n = this, r = ot(), i = new $(U.P);
            return this.Mr(t, e, (function(t, e) {
                var o = n.$r(e);
                o ? (r = r.st(t, o), i = i.st(t, Mr(e))) : (r = r.st(t, null), i = i.st(t, 0));
            })).next((function() {
                return {
                    qr: r,
                    Br: i
                };
            }));
        }, t.prototype.Mr = function(t, e, n) {
            if (e._()) return Fn.resolve();
            var r = IDBKeyRange.bound(e.first().path.N(), e.last().path.N()), i = e.ut(), o = i.wt();
            return Cr(t).Zs({
                range: r
            }, (function(t, e, r) {
                // Go through keys not found in cache.
                for (var s = U.K(t); o && U.P(o, s) < 0; ) n(o, null), o = i.wt();
                o && o.isEqual(s) && (
                // Key found in cache.
                n(o, e), o = i.Tt() ? i.wt() : null), 
                // Skip to the next key (if there is one).
                o ? r.Gs(o.path.N()) : r.done();
            })).next((function() {
                // The rest of the keys are not in the cache. One case where `iterate`
                // above won't go through them is when the cache is empty.
                for (;o; ) n(o, null), o = i.Tt() ? i.wt() : null;
            }));
        }, t.prototype.ns = function(t, e, n) {
            var r = this, i = ut(), o = e.path.length + 1, s = {};
            if (n.isEqual(L.min())) {
                // Documents are ordered by key, so we can use a prefix scan to narrow
                // down the documents we need to match the query against.
                var u = e.path.N();
                s.range = IDBKeyRange.lowerBound(u);
            } else {
                // Execute an index-free query and filter by read time. This is safe
                // since all document changes to queries that have a
                // lastLimboFreeSnapshotVersion (`sinceReadTime`) have a read time set.
                var a = e.path.N(), c = Ir(n);
                s.range = IDBKeyRange.lowerBound([ a, c ], 
                /* open= */ !0), s.index = Zr.collectionReadTimeIndex;
            }
            return Cr(t).Zs(s, (function(t, n, s) {
                // The query is actually returning any path that starts with the query
                // path prefix which may include documents in subcollections. For
                // example, a query on 'rooms' will return rooms/abc/messages/xyx but we
                // shouldn't match it. Fix this by discarding rows with document keys
                // more than one segment longer than the query path.
                if (t.length === o) {
                    var u = br(r.serializer, n);
                    e.path.D(u.key.path) ? u instanceof rn && bn(e, u) && (i = i.st(u.key, u)) : s.done();
                }
            })).next((function() {
                return i;
            }));
        }, 
        /**
         * Returns the set of documents that have changed since the specified read
         * time.
         */
        // PORTING NOTE: This is only used for multi-tab synchronization.
        t.prototype.Ur = function(t, e) {
            var n = this, r = it(), i = Ir(e), o = Cr(t), s = IDBKeyRange.lowerBound(i, !0);
            return o.Zs({
                index: Zr.readTimeIndex,
                range: s
            }, (function(t, e) {
                // Unlike `getEntry()` and others, `getNewDocumentChanges()` parses
                // the documents directly since we want to keep sentinel deletes.
                var o = br(n.serializer, e);
                r = r.st(o.key, o), i = e.readTime;
            })).next((function() {
                return {
                    Qr: r,
                    readTime: Er(i)
                };
            }));
        }, 
        /**
         * Returns the read time of the most recently read document in the cache, or
         * SnapshotVersion.min() if not available.
         */
        // PORTING NOTE: This is only used for multi-tab synchronization.
        t.prototype.Wr = function(t) {
            var e = Cr(t), n = L.min();
            // If there are no existing entries, we return SnapshotVersion.min().
                    return e.Zs({
                index: Zr.readTimeIndex,
                reverse: !0
            }, (function(t, e, r) {
                e.readTime && (n = Er(e.readTime)), r.done();
            })).next((function() {
                return n;
            }));
        }, t.prototype.jr = function(e) {
            return new t.Kr(this, !!e && e.Gr);
        }, t.prototype.zr = function(t) {
            return this.getMetadata(t).next((function(t) {
                return t.byteSize;
            }));
        }, t.prototype.getMetadata = function(t) {
            return Ur(t).get(Xr.key).next((function(t) {
                return y(!!t), t;
            }));
        }, t.prototype.kr = function(t, e) {
            return Ur(t).put(Xr.key, e);
        }, 
        /**
         * Decodes `remoteDoc` and returns the document (or null, if the document
         * corresponds to the format used for sentinel deletes).
         */
        t.prototype.$r = function(t) {
            if (t) {
                var e = br(this.serializer, t);
                return e instanceof on && e.version.isEqual(L.min()) ? null : e;
            }
            return null;
        }, t;
    }();

    /**
     * Handles the details of adding and updating documents in the IndexedDbRemoteDocumentCache.
     *
     * Unlike the MemoryRemoteDocumentChangeBuffer, the IndexedDb implementation computes the size
     * delta for all submitted changes. This avoids having to re-read all documents from IndexedDb
     * when we apply the changes.
     */ function Ur(t) {
        return di.Ms(t, Xr.store);
    }

    /**
     * Helper to get a typed SimpleDbStore for the remoteDocuments object store.
     */ function Cr(t) {
        return di.Ms(t, Zr.store);
    }

    function qr(t) {
        return t.path.N();
    }

    /**
     * Retrusn an approximate size for the given document.
     */ function Mr(t) {
        var e;
        if (t.document) e = t.document; else if (t.unknownDocument) e = t.unknownDocument; else {
            if (!t.noDocument) throw d();
            e = t.noDocument;
        }
        return JSON.stringify(e).length;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * An in-memory implementation of IndexManager.
     */ Vr.Kr = /** @class */ function(e) {
        /**
         * @param documentCache The IndexedDbRemoteDocumentCache to apply the changes to.
         * @param trackRemovals Whether to create sentinel deletes that can be tracked by
         * `getNewDocumentChanges()`.
         */
        function n(t, n) {
            var r = this;
            return (r = e.call(this) || this).Hr = t, r.Gr = n, 
            // A map of document sizes prior to applying the changes in this buffer.
            r.Yr = new S((function(t) {
                return t.toString();
            }), (function(t, e) {
                return t.isEqual(e);
            })), r;
        }
        return t.__extends(n, e), n.prototype.Un = function(t) {
            var e = this, n = [], r = 0, i = new et((function(t, e) {
                return w(t.F(), e.F());
            }));
            return this.Fn.forEach((function(o, s) {
                var u = e.Yr.get(o);
                if (s) {
                    var a = _r(e.Hr.serializer, s, e.readTime);
                    i = i.add(o.path.p());
                    var c = Mr(a);
                    r += c - u, n.push(e.Hr.xn(t, o, a));
                } else if (r -= u, e.Gr) {
                    // In order to track removals, we store a "sentinel delete" in the
                    // RemoteDocumentCache. This entry is represented by a NoDocument
                    // with a version of 0 and ignored by `maybeDecodeDocument()` but
                    // preserved in `getNewDocumentChanges()`.
                    var h = _r(e.Hr.serializer, new on(o, L.min()), e.readTime);
                    n.push(e.Hr.xn(t, o, h));
                } else n.push(e.Hr.Mn(t, o));
            })), i.forEach((function(r) {
                n.push(e.Hr.zn.Ar(t, r));
            })), n.push(this.Hr.updateMetadata(t, r)), Fn.Cn(n);
        }, n.prototype.qn = function(t, e) {
            var n = this;
            // Record the size of everything we load from the cache so we can compute a delta later.
                    return this.Hr.xr(t, e).next((function(t) {
                return null === t ? (n.Yr.set(e, 0), null) : (n.Yr.set(e, t.size), t.Or);
            }));
        }, n.prototype.Bn = function(t, e) {
            var n = this;
            // Record the size of everything we load from the cache so we can compute
            // a delta later.
                    return this.Hr.Lr(t, e).next((function(t) {
                var e = t.qr;
                // Note: `getAllFromCache` returns two maps instead of a single map from
                // keys to `DocumentSizeEntry`s. This is to allow returning the
                // `NullableMaybeDocumentMap` directly, without a conversion.
                return t.Br.forEach((function(t, e) {
                    n.Yr.set(t, e);
                })), e;
            }));
        }, n;
    }(Gn);

    var Fr = /** @class */ function() {
        function t() {
            this.Jr = new Gr;
        }
        return t.prototype.Ar = function(t, e) {
            return this.Jr.add(e), Fn.resolve();
        }, t.prototype.hs = function(t, e) {
            return Fn.resolve(this.Jr.getEntries(e));
        }, t;
    }(), Gr = /** @class */ function() {
        function t() {
            this.index = {};
        }
        // Returns false if the entry already existed.
            return t.prototype.add = function(t) {
            var e = t.S(), n = t.p(), r = this.index[e] || new et(P.P), i = !r.has(n);
            return this.index[e] = r.add(n), i;
        }, t.prototype.has = function(t) {
            var e = t.S(), n = t.p(), r = this.index[e];
            return r && r.has(n);
        }, t.prototype.getEntries = function(t) {
            return (this.index[t] || new et(P.P)).N();
        }, t;
    }(), jr = /** @class */ function() {
        function t(t) {
            this.serializer = t;
        }
        /**
         * Performs database creation and schema upgrades.
         *
         * Note that in production, this method is only ever used to upgrade the schema
         * to SCHEMA_VERSION. Different values of toVersion are only used for testing
         * and local feature development.
         */    return t.prototype.createOrUpgrade = function(t, e, n, r) {
            var i = this;
            y(n < r && n >= 0 && r <= 10);
            var o = new Jn(e);
            n < 1 && r >= 1 && (function(t) {
                t.createObjectStore(zr.store);
            }(t), function(t) {
                t.createObjectStore(Qr.store, {
                    keyPath: Qr.keyPath
                }), t.createObjectStore(Wr.store, {
                    keyPath: Wr.keyPath,
                    autoIncrement: !0
                }).createIndex(Wr.userMutationsIndex, Wr.userMutationsKeyPath, {
                    unique: !0
                }), t.createObjectStore(Hr.store);
            }(t), ni(t), function(t) {
                t.createObjectStore(Zr.store);
            }(t));
            // Migration 2 to populate the targetGlobal object no longer needed since
            // migration 3 unconditionally clears it.
            var s = Fn.resolve();
            return n < 3 && r >= 3 && (
            // Brand new clients don't need to drop and recreate--only clients that
            // potentially have corrupt data.
            0 !== n && (function(t) {
                t.deleteObjectStore(Jr.store), t.deleteObjectStore($r.store), t.deleteObjectStore(ti.store);
            }(t), ni(t)), s = s.next((function() {
                /**
         * Creates the target global singleton row.
         *
         * @param {IDBTransaction} txn The version upgrade transaction for indexeddb
         */
                return function(t) {
                    var e = t.store(ti.store), n = new ti(
                    /*highestTargetId=*/ 0, 
                    /*lastListenSequenceNumber=*/ 0, L.min().A(), 
                    /*targetCount=*/ 0);
                    return e.put(ti.key, n);
                }(o);
            }))), n < 4 && r >= 4 && (0 !== n && (
            // Schema version 3 uses auto-generated keys to generate globally unique
            // mutation batch IDs (this was previously ensured internally by the
            // client). To migrate to the new schema, we have to read all mutations
            // and write them back out. We preserve the existing batch IDs to guarantee
            // consistency with other object stores. Any further mutation batch IDs will
            // be auto-generated.
            s = s.next((function() {
                return function(t, e) {
                    return e.store(Wr.store).Hs().next((function(n) {
                        t.deleteObjectStore(Wr.store), t.createObjectStore(Wr.store, {
                            keyPath: Wr.keyPath,
                            autoIncrement: !0
                        }).createIndex(Wr.userMutationsIndex, Wr.userMutationsKeyPath, {
                            unique: !0
                        });
                        var r = e.store(Wr.store), i = n.map((function(t) {
                            return r.put(t);
                        }));
                        return Fn.Cn(i);
                    }));
                }(t, o);
            }))), s = s.next((function() {
                !function(t) {
                    t.createObjectStore(ri.store, {
                        keyPath: ri.keyPath
                    });
                }(t);
            }))), n < 5 && r >= 5 && (s = s.next((function() {
                return i.removeAcknowledgedMutations(o);
            }))), n < 6 && r >= 6 && (s = s.next((function() {
                return function(t) {
                    t.createObjectStore(Xr.store);
                }(t), i.addDocumentGlobal(o);
            }))), n < 7 && r >= 7 && (s = s.next((function() {
                return i.ensureSequenceNumbers(o);
            }))), n < 8 && r >= 8 && (s = s.next((function() {
                return i.createCollectionParentIndex(t, o);
            }))), n < 9 && r >= 9 && (s = s.next((function() {
                // Multi-Tab used to manage its own changelog, but this has been moved
                // to the DbRemoteDocument object store itself. Since the previous change
                // log only contained transient data, we can drop its object store.
                !function(t) {
                    t.objectStoreNames.contains("remoteDocumentChanges") && t.deleteObjectStore("remoteDocumentChanges");
                }(t), function(t) {
                    var e = t.objectStore(Zr.store);
                    e.createIndex(Zr.readTimeIndex, Zr.readTimeIndexPath, {
                        unique: !1
                    }), e.createIndex(Zr.collectionReadTimeIndex, Zr.collectionReadTimeIndexPath, {
                        unique: !1
                    });
                }(e);
            }))), n < 10 && r >= 10 && (s = s.next((function() {
                return i.rewriteCanonicalIds(o);
            }))), s;
        }, t.prototype.addDocumentGlobal = function(t) {
            var e = 0;
            return t.store(Zr.store).Zs((function(t, n) {
                e += Mr(n);
            })).next((function() {
                var n = new Xr(e);
                return t.store(Xr.store).put(Xr.key, n);
            }));
        }, t.prototype.removeAcknowledgedMutations = function(t) {
            var e = this, n = t.store(Qr.store), r = t.store(Wr.store);
            return n.Hs().next((function(n) {
                return Fn.forEach(n, (function(n) {
                    var i = IDBKeyRange.bound([ n.userId, -1 ], [ n.userId, n.lastAcknowledgedBatchId ]);
                    return r.Hs(Wr.userMutationsIndex, i).next((function(r) {
                        return Fn.forEach(r, (function(r) {
                            y(r.userId === n.userId);
                            var i = Ar(e.serializer, r);
                            return Lr(t, n.userId, i).next((function() {}));
                        }));
                    }));
                }));
            }));
        }, 
        /**
         * Ensures that every document in the remote document cache has a corresponding sentinel row
         * with a sequence number. Missing rows are given the most recently used sequence number.
         */
        t.prototype.ensureSequenceNumbers = function(t) {
            var e = t.store(Jr.store), n = t.store(Zr.store);
            return t.store(ti.store).get(ti.key).next((function(t) {
                var r = [];
                return n.Zs((function(n, i) {
                    var o = new P(n), s = function(t) {
                        return [ 0, yr(t) ];
                    }(o);
                    r.push(e.get(s).next((function(n) {
                        return n ? Fn.resolve() : function(n) {
                            return e.put(new Jr(0, yr(n), t.highestListenSequenceNumber));
                        }(o);
                    })));
                })).next((function() {
                    return Fn.Cn(r);
                }));
            }));
        }, t.prototype.createCollectionParentIndex = function(t, e) {
            // Create the index.
            t.createObjectStore(ei.store, {
                keyPath: ei.keyPath
            });
            var n = e.store(ei.store), r = new Gr, i = function(t) {
                if (r.add(t)) {
                    var e = t.S(), i = t.p();
                    return n.put({
                        collectionId: e,
                        parent: yr(i)
                    });
                }
            };
            // Helper to add an index entry iff we haven't already written it.
            // Index existing remote documents.
                    return e.store(Zr.store).Zs({
                Xs: !0
            }, (function(t, e) {
                var n = new P(t);
                return i(n.p());
            })).next((function() {
                return e.store(Hr.store).Zs({
                    Xs: !0
                }, (function(t, e) {
                    t[0];
                    var n = t[1], r = (t[2], mr(n));
                    return i(r.p());
                }));
            }));
        }, t.prototype.rewriteCanonicalIds = function(t) {
            var e = this, n = t.store($r.store);
            return n.Zs((function(t, r) {
                var i = Sr(r), o = Dr(e.serializer, i);
                return n.put(o);
            }));
        }, t;
    }(), Br = function(t, e) {
        this.seconds = t, this.nanoseconds = e;
    }, zr = function(t, 
    /** Whether to allow shared access from multiple tabs. */
    e, n) {
        this.ownerId = t, this.allowTabSynchronization = e, this.leaseTimestampMs = n;
    };

    /**
     * Internal implementation of the collection-parent index exposed by MemoryIndexManager.
     * Also used for in-memory caching by IndexedDbIndexManager and initial index population
     * in indexeddb_schema.ts
     */
    /**
     * Name of the IndexedDb object store.
     *
     * Note that the name 'owner' is chosen to ensure backwards compatibility with
     * older clients that only supported single locked access to the persistence
     * layer.
     */
    zr.store = "owner", 
    /**
         * The key string used for the single object that exists in the
         * DbPrimaryClient store.
         */
    zr.key = "owner";

    var Qr = function(
    /**
         * The normalized user ID to which this queue belongs.
         */
    t, 
    /**
         * An identifier for the highest numbered batch that has been acknowledged
         * by the server. All MutationBatches in this queue with batchIds less
         * than or equal to this value are considered to have been acknowledged by
         * the server.
         *
         * NOTE: this is deprecated and no longer used by the code.
         */
    e, 
    /**
         * A stream token that was previously sent by the server.
         *
         * See StreamingWriteRequest in datastore.proto for more details about
         * usage.
         *
         * After sending this token, earlier tokens may not be used anymore so
         * only a single stream token is retained.
         *
         * NOTE: this is deprecated and no longer used by the code.
         */
    n) {
        this.userId = t, this.lastAcknowledgedBatchId = e, this.lastStreamToken = n;
    };

    /** Name of the IndexedDb object store.  */ Qr.store = "mutationQueues", 
    /** Keys are automatically assigned via the userId property. */
    Qr.keyPath = "userId";

    /**
     * An object to be stored in the 'mutations' store in IndexedDb.
     *
     * Represents a batch of user-level mutations intended to be sent to the server
     * in a single write. Each user-level batch gets a separate DbMutationBatch
     * with a new batchId.
     */
    var Wr = function(
    /**
         * The normalized user ID to which this batch belongs.
         */
    t, 
    /**
         * An identifier for this batch, allocated using an auto-generated key.
         */
    e, 
    /**
         * The local write time of the batch, stored as milliseconds since the
         * epoch.
         */
    n, 
    /**
         * A list of "mutations" that represent a partial base state from when this
         * write batch was initially created. During local application of the write
         * batch, these baseMutations are applied prior to the real writes in order
         * to override certain document fields from the remote document cache. This
         * is necessary in the case of non-idempotent writes (e.g. `increment()`
         * transforms) to make sure that the local view of the modified documents
         * doesn't flicker if the remote document cache receives the result of the
         * non-idempotent write before the write is removed from the queue.
         *
         * These mutations are never sent to the backend.
         */
    r, 
    /**
         * A list of mutations to apply. All mutations will be applied atomically.
         *
         * Mutations are serialized via toMutation().
         */
    i) {
        this.userId = t, this.batchId = e, this.localWriteTimeMs = n, this.baseMutations = r, 
        this.mutations = i;
    };

    /** Name of the IndexedDb object store.  */ Wr.store = "mutations", 
    /** Keys are automatically assigned via the userId, batchId properties. */
    Wr.keyPath = "batchId", 
    /** The index name for lookup of mutations by user. */
    Wr.userMutationsIndex = "userMutationsIndex", 
    /** The user mutations index is keyed by [userId, batchId] pairs. */
    Wr.userMutationsKeyPath = [ "userId", "batchId" ];

    var Hr = /** @class */ function() {
        function t() {}
        /**
         * Creates a [userId] key for use in the DbDocumentMutations index to iterate
         * over all of a user's document mutations.
         */    return t.prefixForUser = function(t) {
            return [ t ];
        }, 
        /**
         * Creates a [userId, encodedPath] key for use in the DbDocumentMutations
         * index to iterate over all at document mutations for a given path or lower.
         */
        t.prefixForPath = function(t, e) {
            return [ t, yr(e) ];
        }, 
        /**
         * Creates a full index key of [userId, encodedPath, batchId] for inserting
         * and deleting into the DbDocumentMutations index.
         */
        t.key = function(t, e, n) {
            return [ t, yr(e), n ];
        }, t;
    }();

    Hr.store = "documentMutations", 
    /**
         * Because we store all the useful information for this store in the key,
         * there is no useful information to store as the value. The raw (unencoded)
         * path cannot be stored because IndexedDb doesn't store prototype
         * information.
         */
    Hr.PLACEHOLDER = new Hr;

    var Kr = function(t, e) {
        this.path = t, this.readTime = e;
    }, Yr = function(t, e) {
        this.path = t, this.version = e;
    }, Zr = 
    // TODO: We are currently storing full document keys almost three times
    // (once as part of the primary key, once - partly - as `parentPath` and once
    // inside the encoded documents). During our next migration, we should
    // rewrite the primary key as parentPath + document ID which would allow us
    // to drop one value.
    function(
    /**
         * Set to an instance of DbUnknownDocument if the data for a document is
         * not known, but it is known that a document exists at the specified
         * version (e.g. it had a successful update applied to it)
         */
    t, 
    /**
         * Set to an instance of a DbNoDocument if it is known that no document
         * exists.
         */
    e, 
    /**
         * Set to an instance of a Document if there's a cached version of the
         * document.
         */
    n, 
    /**
         * Documents that were written to the remote document store based on
         * a write acknowledgment are marked with `hasCommittedMutations`. These
         * documents are potentially inconsistent with the backend's copy and use
         * the write's commit version as their document version.
         */
    r, 
    /**
         * When the document was read from the backend. Undefined for data written
         * prior to schema version 9.
         */
    i, 
    /**
         * The path of the collection this document is part of. Undefined for data
         * written prior to schema version 9.
         */
    o) {
        this.unknownDocument = t, this.noDocument = e, this.document = n, this.hasCommittedMutations = r, 
        this.readTime = i, this.parentPath = o;
    };

    /**
     * Represents a document that is known to exist but whose data is unknown.
     * Stored in IndexedDb as part of a DbRemoteDocument object.
     */ Zr.store = "remoteDocuments", 
    /**
         * An index that provides access to all entries sorted by read time (which
         * corresponds to the last modification time of each row).
         *
         * This index is used to provide a changelog for Multi-Tab.
         */
    Zr.readTimeIndex = "readTimeIndex", Zr.readTimeIndexPath = "readTime", 
    /**
         * An index that provides access to documents in a collection sorted by read
         * time.
         *
         * This index is used to allow the RemoteDocumentCache to fetch newly changed
         * documents in a collection.
         */
    Zr.collectionReadTimeIndex = "collectionReadTimeIndex", Zr.collectionReadTimeIndexPath = [ "parentPath", "readTime" ];

    /**
     * Contains a single entry that has metadata about the remote document cache.
     */
    var Xr = 
    /**
         * @param byteSize Approximately the total size in bytes of all the documents in the document
         * cache.
         */
    function(t) {
        this.byteSize = t;
    };

    Xr.store = "remoteDocumentGlobal", Xr.key = "remoteDocumentGlobalKey";

    var $r = function(
    /**
         * An auto-generated sequential numeric identifier for the query.
         *
         * Queries are stored using their canonicalId as the key, but these
         * canonicalIds can be quite long so we additionally assign a unique
         * queryId which can be used by referenced data structures (e.g.
         * indexes) to minimize the on-disk cost.
         */
    t, 
    /**
         * The canonical string representing this query. This is not unique.
         */
    e, 
    /**
         * The last readTime received from the Watch Service for this query.
         *
         * This is the same value as TargetChange.read_time in the protos.
         */
    n, 
    /**
         * An opaque, server-assigned token that allows watching a query to be
         * resumed after disconnecting without retransmitting all the data
         * that matches the query. The resume token essentially identifies a
         * point in time from which the server should resume sending results.
         *
         * This is related to the snapshotVersion in that the resumeToken
         * effectively also encodes that value, but the resumeToken is opaque
         * and sometimes encodes additional information.
         *
         * A consequence of this is that the resumeToken should be used when
         * asking the server to reason about where this client is in the watch
         * stream, but the client should use the snapshotVersion for its own
         * purposes.
         *
         * This is the same value as TargetChange.resume_token in the protos.
         */
    r, 
    /**
         * A sequence number representing the last time this query was
         * listened to, used for garbage collection purposes.
         *
         * Conventionally this would be a timestamp value, but device-local
         * clocks are unreliable and they must be able to create new listens
         * even while disconnected. Instead this should be a monotonically
         * increasing number that's incremented on each listen call.
         *
         * This is different from the queryId since the queryId is an
         * immutable identifier assigned to the Query on first use while
         * lastListenSequenceNumber is updated every time the query is
         * listened to.
         */
    i, 
    /**
         * Denotes the maximum snapshot version at which the associated query view
         * contained no limbo documents.  Undefined for data written prior to
         * schema version 9.
         */
    o, 
    /**
         * The query for this target.
         *
         * Because canonical ids are not unique we must store the actual query. We
         * use the proto to have an object we can persist without having to
         * duplicate translation logic to and from a `Query` object.
         */
    s) {
        this.targetId = t, this.canonicalId = e, this.readTime = n, this.resumeToken = r, 
        this.lastListenSequenceNumber = i, this.lastLimboFreeSnapshotVersion = o, this.query = s;
    };

    $r.store = "targets", 
    /** Keys are automatically assigned via the targetId property. */
    $r.keyPath = "targetId", 
    /** The name of the queryTargets index. */
    $r.queryTargetsIndexName = "queryTargetsIndex", 
    /**
         * The index of all canonicalIds to the targets that they match. This is not
         * a unique mapping because canonicalId does not promise a unique name for all
         * possible queries, so we append the targetId to make the mapping unique.
         */
    $r.queryTargetsKeyPath = [ "canonicalId", "targetId" ];

    /**
     * An object representing an association between a target and a document, or a
     * sentinel row marking the last sequence number at which a document was used.
     * Each document cached must have a corresponding sentinel row before lru
     * garbage collection is enabled.
     *
     * The target associations and sentinel rows are co-located so that orphaned
     * documents and their sequence numbers can be identified efficiently via a scan
     * of this store.
     */
    var Jr = function(
    /**
         * The targetId identifying a target or 0 for a sentinel row.
         */
    t, 
    /**
         * The path to the document, as encoded in the key.
         */
    e, 
    /**
         * If this is a sentinel row, this should be the sequence number of the last
         * time the document specified by `path` was used. Otherwise, it should be
         * `undefined`.
         */
    n) {
        this.targetId = t, this.path = e, this.sequenceNumber = n;
    };

    /** Name of the IndexedDb object store.  */ Jr.store = "targetDocuments", 
    /** Keys are automatically assigned via the targetId, path properties. */
    Jr.keyPath = [ "targetId", "path" ], 
    /** The index name for the reverse index. */
    Jr.documentTargetsIndex = "documentTargetsIndex", 
    /** We also need to create the reverse index for these properties. */
    Jr.documentTargetsKeyPath = [ "path", "targetId" ];

    /**
     * A record of global state tracked across all Targets, tracked separately
     * to avoid the need for extra indexes.
     *
     * This should be kept in-sync with the proto used in the iOS client.
     */
    var ti = function(
    /**
         * The highest numbered target id across all targets.
         *
         * See DbTarget.targetId.
         */
    t, 
    /**
         * The highest numbered lastListenSequenceNumber across all targets.
         *
         * See DbTarget.lastListenSequenceNumber.
         */
    e, 
    /**
         * A global snapshot version representing the last consistent snapshot we
         * received from the backend. This is monotonically increasing and any
         * snapshots received from the backend prior to this version (e.g. for
         * targets resumed with a resumeToken) should be suppressed (buffered)
         * until the backend has caught up to this snapshot version again. This
         * prevents our cache from ever going backwards in time.
         */
    n, 
    /**
         * The number of targets persisted.
         */
    r) {
        this.highestTargetId = t, this.highestListenSequenceNumber = e, this.lastRemoteSnapshotVersion = n, 
        this.targetCount = r;
    };

    /**
     * The key string used for the single object that exists in the
     * DbTargetGlobal store.
     */ ti.key = "targetGlobalKey", ti.store = "targetGlobal";

    /**
     * An object representing an association between a Collection id (e.g. 'messages')
     * to a parent path (e.g. '/chats/123') that contains it as a (sub)collection.
     * This is used to efficiently find all collections to query when performing
     * a Collection Group query.
     */
    var ei = function(
    /**
         * The collectionId (e.g. 'messages')
         */
    t, 
    /**
         * The path to the parent (either a document location or an empty path for
         * a root-level collection).
         */
    e) {
        this.collectionId = t, this.parent = e;
    };

    /** Name of the IndexedDb object store. */ function ni(t) {
        t.createObjectStore(Jr.store, {
            keyPath: Jr.keyPath
        }).createIndex(Jr.documentTargetsIndex, Jr.documentTargetsKeyPath, {
            unique: !0
        }), 
        // NOTE: This is unique only because the TargetId is the suffix.
        t.createObjectStore($r.store, {
            keyPath: $r.keyPath
        }).createIndex($r.queryTargetsIndexName, $r.queryTargetsKeyPath, {
            unique: !0
        }), t.createObjectStore(ti.store);
    }

    ei.store = "collectionParents", 
    /** Keys are automatically assigned via the collectionId, parent properties. */
    ei.keyPath = [ "collectionId", "parent" ];

    var ri = function(
    // Note: Previous schema versions included a field
    // "lastProcessedDocumentChangeId". Don't use anymore.
    /** The auto-generated client id assigned at client startup. */
    t, 
    /** The last time this state was updated. */
    e, 
    /** Whether the client's network connection is enabled. */
    n, 
    /** Whether this client is running in a foreground tab. */
    r) {
        this.clientId = t, this.updateTimeMs = e, this.networkEnabled = n, this.inForeground = r;
    };

    /** Name of the IndexedDb object store. */ ri.store = "clientMetadata", 
    /** Keys are automatically assigned via the clientId properties. */
    ri.keyPath = "clientId";

    var ii = t.__spreadArrays(t.__spreadArrays(t.__spreadArrays([ Qr.store, Wr.store, Hr.store, Zr.store, $r.store, zr.store, ti.store, Jr.store ], [ ri.store ]), [ Xr.store ]), [ ei.store ]), oi = /** @class */ function() {
        function t() {
            /**
             * An in-memory copy of the index entries we've already written since the SDK
             * launched. Used to avoid re-writing the same entry repeatedly.
             *
             * This is *NOT* a complete cache of what's in persistence and so can never be used to
             * satisfy reads.
             */
            this.Xr = new Gr;
        }
        /**
         * Adds a new entry to the collection parent index.
         *
         * Repeated calls for the same collectionPath should be avoided within a
         * transaction as IndexedDbIndexManager only caches writes once a transaction
         * has been committed.
         */    return t.prototype.Ar = function(t, e) {
            var n = this;
            if (!this.Xr.has(e)) {
                var r = e.S(), i = e.p();
                t.Wn((function() {
                    // Add the collection to the in memory cache only if the transaction was
                    // successfully committed.
                    n.Xr.add(e);
                }));
                var o = {
                    collectionId: r,
                    parent: yr(i)
                };
                return si(t).put(o);
            }
            return Fn.resolve();
        }, t.prototype.hs = function(t, e) {
            var n = [], r = IDBKeyRange.bound([ e, "" ], [ _(e), "" ], 
            /*lowerOpen=*/ !1, 
            /*upperOpen=*/ !0);
            return si(t).Hs(r).next((function(t) {
                for (var r = 0, i = t; r < i.length; r++) {
                    var o = i[r];
                    // This collectionId guard shouldn't be necessary (and isn't as long
                    // as we're running in a real browser), but there's a bug in
                    // indexeddbshim that breaks our range in our tests running in node:
                    // https://github.com/axemclion/IndexedDBShim/issues/334
                                    if (o.collectionId !== e) break;
                    n.push(mr(o.parent));
                }
                return n;
            }));
        }, t;
    }();

    // V2 is no longer usable (see comment at top of file)
    // Visible for testing
    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A persisted implementation of IndexManager.
     */
    /**
     * Helper to get a typed SimpleDbStore for the collectionParents
     * document store.
     */
    function si(t) {
        return di.Ms(t, ei.store);
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /** Offset to ensure non-overlapping target ids. */
    /**
     * Generates monotonically increasing target IDs for sending targets to the
     * watch stream.
     *
     * The client constructs two generators, one for the target cache, and one for
     * for the sync engine (to generate limbo documents targets). These
     * generators produce non-overlapping IDs (by using even and odd IDs
     * respectively).
     *
     * By separating the target ID space, the query cache can generate target IDs
     * that persist across client restarts, while sync engine can independently
     * generate in-memory target IDs that are transient and can be reused after a
     * restart.
     */ var ui = /** @class */ function() {
        function t(t) {
            this.Zr = t;
        }
        return t.prototype.next = function() {
            return this.Zr += 2, this.Zr;
        }, t.to = function() {
            // The target cache generator must return '2' in its first call to `next()`
            // as there is no differentiation in the protocol layer between an unset
            // number and the number '0'. If we were to sent a target with target ID
            // '0', the backend would consider it unset and replace it with its own ID.
            return new t(0);
        }, t.eo = function() {
            // Sync engine assigns target IDs for limbo document detection.
            return new t(-1);
        }, t;
    }(), ai = /** @class */ function() {
        function t(t, e) {
            this.dr = t, this.serializer = e;
        }
        // PORTING NOTE: We don't cache global metadata for the target cache, since
        // some of it (in particular `highestTargetId`) can be modified by secondary
        // tabs. We could perhaps be more granular (and e.g. still cache
        // `lastRemoteSnapshotVersion` in memory) but for simplicity we currently go
        // to IndexedDb whenever we need to read metadata. We can revisit if it turns
        // out to have a meaningful performance impact.
            return t.prototype.no = function(t) {
            var e = this;
            return this.so(t).next((function(n) {
                var r = new ui(n.highestTargetId);
                return n.highestTargetId = r.next(), e.io(t, n).next((function() {
                    return n.highestTargetId;
                }));
            }));
        }, t.prototype.ro = function(t) {
            return this.so(t).next((function(t) {
                return L.I(new k(t.lastRemoteSnapshotVersion.seconds, t.lastRemoteSnapshotVersion.nanoseconds));
            }));
        }, t.prototype.oo = function(t) {
            return this.so(t).next((function(t) {
                return t.highestListenSequenceNumber;
            }));
        }, t.prototype.ho = function(t, e, n) {
            var r = this;
            return this.so(t).next((function(i) {
                return i.highestListenSequenceNumber = e, n && (i.lastRemoteSnapshotVersion = n.A()), 
                e > i.highestListenSequenceNumber && (i.highestListenSequenceNumber = e), r.io(t, i);
            }));
        }, t.prototype.ao = function(t, e) {
            var n = this;
            return this.uo(t, e).next((function() {
                return n.so(t).next((function(r) {
                    return r.targetCount += 1, n.co(e, r), n.io(t, r);
                }));
            }));
        }, t.prototype.lo = function(t, e) {
            return this.uo(t, e);
        }, t.prototype._o = function(t, e) {
            var n = this;
            return this.fo(t, e.targetId).next((function() {
                return ci(t).delete(e.targetId);
            })).next((function() {
                return n.so(t);
            })).next((function(e) {
                return y(e.targetCount > 0), e.targetCount -= 1, n.io(t, e);
            }));
        }, 
        /**
         * Drops any targets with sequence number less than or equal to the upper bound, excepting those
         * present in `activeTargetIds`. Document associations for the removed targets are also removed.
         * Returns the number of targets removed.
         */
        t.prototype.hr = function(t, e, n) {
            var r = this, i = 0, o = [];
            return ci(t).Zs((function(s, u) {
                var a = Sr(u);
                a.sequenceNumber <= e && null === n.get(a.targetId) && (i++, o.push(r._o(t, a)));
            })).next((function() {
                return Fn.Cn(o);
            })).next((function() {
                return i;
            }));
        }, 
        /**
         * Call provided function with each `TargetData` that we have cached.
         */
        t.prototype.be = function(t, e) {
            return ci(t).Zs((function(t, n) {
                var r = Sr(n);
                e(r);
            }));
        }, t.prototype.so = function(t) {
            return hi(t).get(ti.key).next((function(t) {
                return y(null !== t), t;
            }));
        }, t.prototype.io = function(t, e) {
            return hi(t).put(ti.key, e);
        }, t.prototype.uo = function(t, e) {
            return ci(t).put(Dr(this.serializer, e));
        }, 
        /**
         * In-place updates the provided metadata to account for values in the given
         * TargetData. Saving is done separately. Returns true if there were any
         * changes to the metadata.
         */
        t.prototype.co = function(t, e) {
            var n = !1;
            return t.targetId > e.highestTargetId && (e.highestTargetId = t.targetId, n = !0), 
            t.sequenceNumber > e.highestListenSequenceNumber && (e.highestListenSequenceNumber = t.sequenceNumber, 
            n = !0), n;
        }, t.prototype.do = function(t) {
            return this.so(t).next((function(t) {
                return t.targetCount;
            }));
        }, t.prototype.wo = function(t, e) {
            // Iterating by the canonicalId may yield more than one result because
            // canonicalId values are not required to be unique per target. This query
            // depends on the queryTargets index to be efficient.
            var n = j(e), r = IDBKeyRange.bound([ n, Number.NEGATIVE_INFINITY ], [ n, Number.POSITIVE_INFINITY ]), i = null;
            return ci(t).Zs({
                range: r,
                index: $r.queryTargetsIndexName
            }, (function(t, n, r) {
                var o = Sr(n);
                // After finding a potential match, check that the target is
                // actually equal to the requested target.
                            B(e, o.target) && (i = o, r.done());
            })).next((function() {
                return i;
            }));
        }, t.prototype.To = function(t, e, n) {
            var r = this, i = [], o = fi(t);
            // PORTING NOTE: The reverse index (documentsTargets) is maintained by
            // IndexedDb.
                    return e.forEach((function(e) {
                var s = yr(e.path);
                i.push(o.put(new Jr(n, s))), i.push(r.dr.Eo(t, n, e));
            })), Fn.Cn(i);
        }, t.prototype.Io = function(t, e, n) {
            var r = this, i = fi(t);
            // PORTING NOTE: The reverse index (documentsTargets) is maintained by
            // IndexedDb.
                    return Fn.forEach(e, (function(e) {
                var o = yr(e.path);
                return Fn.Cn([ i.delete([ n, o ]), r.dr.mo(t, n, e) ]);
            }));
        }, t.prototype.fo = function(t, e) {
            var n = fi(t), r = IDBKeyRange.bound([ e ], [ e + 1 ], 
            /*lowerOpen=*/ !1, 
            /*upperOpen=*/ !0);
            return n.delete(r);
        }, t.prototype.Ao = function(t, e) {
            var n = IDBKeyRange.bound([ e ], [ e + 1 ], 
            /*lowerOpen=*/ !1, 
            /*upperOpen=*/ !0), r = fi(t), i = ht();
            return r.Zs({
                range: n,
                Xs: !0
            }, (function(t, e, n) {
                var r = mr(t[1]), o = new U(r);
                i = i.add(o);
            })).next((function() {
                return i;
            }));
        }, t.prototype.Nr = function(t, e) {
            var n = yr(e.path), r = IDBKeyRange.bound([ n ], [ _(n) ], 
            /*lowerOpen=*/ !1, 
            /*upperOpen=*/ !0), i = 0;
            return fi(t).Zs({
                index: Jr.documentTargetsIndex,
                Xs: !0,
                range: r
            }, (function(t, e, n) {
                var r = t[0];
                // Having a sentinel row for a document does not count as containing that document;
                // For the target cache, containing the document means the document is part of some
                // target.
                            t[1];
                0 !== r && (i++, n.done());
            })).next((function() {
                return i > 0;
            }));
        }, 
        /**
         * Looks up a TargetData entry by target ID.
         *
         * @param targetId The target ID of the TargetData entry to look up.
         * @return The cached TargetData entry, or null if the cache has no entry for
         * the target.
         */
        // PORTING NOTE: Multi-tab only.
        t.prototype.Me = function(t, e) {
            return ci(t).get(e).next((function(t) {
                return t ? Sr(t) : null;
            }));
        }, t;
    }();

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Helper to get a typed SimpleDbStore for the queries object store.
     */
    function ci(t) {
        return di.Ms(t, $r.store);
    }

    /**
     * Helper to get a typed SimpleDbStore for the target globals object store.
     */ function hi(t) {
        return di.Ms(t, ti.store);
    }

    /**
     * Helper to get a typed SimpleDbStore for the document target object store.
     */ function fi(t) {
        return di.Ms(t, Jr.store);
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ var li = "Failed to obtain exclusive access to the persistence layer. To allow shared access, make sure to invoke `enablePersistence()` with `synchronizeTabs:true` in all tabs. If you are using `experimentalForceOwningTab:true`, make sure that only one tab has persistence enabled at any given time.", pi = /** @class */ function(e) {
        function n(t, n) {
            var r = this;
            return (r = e.call(this) || this).vr = t, r.Ro = n, r;
        }
        return t.__extends(n, e), n;
    }(Bn), di = /** @class */ function() {
        function e(
        /**
         * Whether to synchronize the in-memory state of multiple tabs and share
         * access to local persistence.
         */
        t, n, r, i, o, s, u, a, c, 
        /**
         * If set to true, forcefully obtains database access. Existing tabs will
         * no longer be able to access IndexedDB.
         */
        h) {
            if (this.allowTabSynchronization = t, this.persistenceKey = n, this.clientId = r, 
            this.Is = o, this.window = s, this.document = u, this.Po = c, this.Vo = h, this.yo = null, 
            this.po = !1, this.isPrimary = !1, this.networkEnabled = !0, 
            /** Our window.unload handler, if registered. */
            this.bo = null, this.inForeground = !1, 
            /** Our 'visibilitychange' listener if registered. */
            this.vo = null, 
            /** The client metadata refresh task. */
            this.So = null, 
            /** The last time we garbage collected the client metadata object store. */
            this.Do = Number.NEGATIVE_INFINITY, 
            /** A listener to notify on primary state changes. */
            this.Co = function(t) {
                return Promise.resolve();
            }, !e.ks()) throw new x(D.UNIMPLEMENTED, "This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.");
            this.dr = new gi(this, i), this.No = n + "main", this.serializer = new wr(a), this.Fo = new Yn(this.No, 10, new jr(this.serializer)), 
            this.ko = new ai(this.dr, this.serializer), this.zn = new oi, this.Kn = new Vr(this.serializer, this.zn), 
            this.window && this.window.localStorage ? this.$o = this.window.localStorage : (this.$o = null, 
            !1 === h && f("IndexedDbPersistence", "LocalStorage is unavailable. As a result, persistence may not work reliably. In particular enablePersistence() could fail immediately after refreshing the page."));
        }
        return e.Ms = function(t, e) {
            if (t instanceof pi) return Yn.Ms(t.vr, e);
            throw d();
        }, 
        /**
         * Attempt to start IndexedDb persistence.
         *
         * @return {Promise<void>} Whether persistence was enabled.
         */
        e.prototype.start = function() {
            var t = this;
            // NOTE: This is expected to fail sometimes (in the case of another tab
            // already having the persistence lock), so it's the first thing we should
            // do.
                    return this.xo().then((function() {
                if (!t.isPrimary && !t.allowTabSynchronization) 
                // Fail `start()` if `synchronizeTabs` is disabled and we cannot
                // obtain the primary lease.
                throw new x(D.FAILED_PRECONDITION, li);
                return t.Oo(), t.Mo(), t.Lo(), t.runTransaction("getHighestListenSequenceNumber", "readonly", (function(e) {
                    return t.ko.oo(e);
                }));
            })).then((function(e) {
                t.yo = new Wn(e, t.Po);
            })).then((function() {
                t.po = !0;
            })).catch((function(e) {
                return t.Fo && t.Fo.close(), Promise.reject(e);
            }));
        }, 
        /**
         * Registers a listener that gets called when the primary state of the
         * instance changes. Upon registering, this listener is invoked immediately
         * with the current primary state.
         *
         * PORTING NOTE: This is only used for Web multi-tab.
         */
        e.prototype.qo = function(e) {
            var n = this;
            return this.Co = function(r) {
                return t.__awaiter(n, void 0, void 0, (function() {
                    return t.__generator(this, (function(t) {
                        return this.tr ? [ 2 /*return*/ , e(r) ] : [ 2 /*return*/ ];
                    }));
                }));
            }, e(this.isPrimary);
        }, 
        /**
         * Registers a listener that gets called when the database receives a
         * version change event indicating that it has deleted.
         *
         * PORTING NOTE: This is only used for Web multi-tab.
         */
        e.prototype.Bo = function(e) {
            var n = this;
            this.Fo.Bs((function(r) {
                return t.__awaiter(n, void 0, void 0, (function() {
                    return t.__generator(this, (function(t) {
                        switch (t.label) {
                          case 0:
                            return null === r.newVersion ? [ 4 /*yield*/ , e() ] : [ 3 /*break*/ , 2 ];

                          case 1:
                            t.sent(), t.label = 2;

                          case 2:
                            return [ 2 /*return*/ ];
                        }
                    }));
                }));
            }));
        }, 
        /**
         * Adjusts the current network state in the client's metadata, potentially
         * affecting the primary lease.
         *
         * PORTING NOTE: This is only used for Web multi-tab.
         */
        e.prototype.Uo = function(e) {
            var n = this;
            this.networkEnabled !== e && (this.networkEnabled = e, 
            // Schedule a primary lease refresh for immediate execution. The eventual
            // lease update will be propagated via `primaryStateListener`.
            this.Is.ai((function() {
                return t.__awaiter(n, void 0, void 0, (function() {
                    return t.__generator(this, (function(t) {
                        switch (t.label) {
                          case 0:
                            return this.tr ? [ 4 /*yield*/ , this.xo() ] : [ 3 /*break*/ , 2 ];

                          case 1:
                            t.sent(), t.label = 2;

                          case 2:
                            return [ 2 /*return*/ ];
                        }
                    }));
                }));
            })));
        }, 
        /**
         * Updates the client metadata in IndexedDb and attempts to either obtain or
         * extend the primary lease for the local client. Asynchronously notifies the
         * primary state listener if the client either newly obtained or released its
         * primary lease.
         */
        e.prototype.xo = function() {
            var t = this;
            return this.runTransaction("updateClientMetadataAndTryBecomePrimary", "readwrite", (function(e) {
                return vi(e).put(new ri(t.clientId, Date.now(), t.networkEnabled, t.inForeground)).next((function() {
                    if (t.isPrimary) return t.Qo(e).next((function(e) {
                        e || (t.isPrimary = !1, t.Is.gi((function() {
                            return t.Co(!1);
                        })));
                    }));
                })).next((function() {
                    return t.Wo(e);
                })).next((function(n) {
                    return t.isPrimary && !n ? t.jo(e).next((function() {
                        return !1;
                    })) : !!n && t.Ko(e).next((function() {
                        return !0;
                    }));
                }));
            })).catch((function(e) {
                if ($n(e)) 
                // Proceed with the existing state. Any subsequent access to
                // IndexedDB will verify the lease.
                return h("IndexedDbPersistence", "Failed to extend owner lease: ", e), t.isPrimary;
                if (!t.allowTabSynchronization) throw e;
                return h("IndexedDbPersistence", "Releasing owner lease after error during lease refresh", e), 
                /* isPrimary= */ !1;
            })).then((function(e) {
                t.isPrimary !== e && t.Is.gi((function() {
                    return t.Co(e);
                })), t.isPrimary = e;
            }));
        }, e.prototype.Qo = function(t) {
            var e = this;
            return yi(t).get(zr.key).next((function(t) {
                return Fn.resolve(e.Go(t));
            }));
        }, e.prototype.zo = function(t) {
            return vi(t).delete(this.clientId);
        }, 
        /**
         * If the garbage collection threshold has passed, prunes the
         * RemoteDocumentChanges and the ClientMetadata store based on the last update
         * time of all clients.
         */
        e.prototype.Ho = function() {
            return t.__awaiter(this, void 0, void 0, (function() {
                var n, r, i, o, s = this;
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        return !this.isPrimary || this.Yo(this.Do, 18e5) ? [ 3 /*break*/ , 2 ] : (this.Do = Date.now(), 
                        [ 4 /*yield*/ , this.runTransaction("maybeGarbageCollectMultiClientState", "readwrite-primary", (function(t) {
                            var n = e.Ms(t, ri.store);
                            return n.Hs().next((function(t) {
                                var e = s.Jo(t, 18e5), r = t.filter((function(t) {
                                    return -1 === e.indexOf(t);
                                }));
                                // Delete metadata for clients that are no longer considered active.
                                                            return Fn.forEach(r, (function(t) {
                                    return n.delete(t.clientId);
                                })).next((function() {
                                    return r;
                                }));
                            }));
                        })).catch((function() {
                            return [];
                        })) ]);

                      case 1:
                        // Delete potential leftover entries that may continue to mark the
                        // inactive clients as zombied in LocalStorage.
                        // Ideally we'd delete the IndexedDb and LocalStorage zombie entries for
                        // the client atomically, but we can't. So we opt to delete the IndexedDb
                        // entries first to avoid potentially reviving a zombied client.
                        if (n = t.sent(), this.$o) for (r = 0, i = n; r < i.length; r++) o = i[r], this.$o.removeItem(this.Xo(o.clientId));
                        t.label = 2;

                      case 2:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        }, 
        /**
         * Schedules a recurring timer to update the client metadata and to either
         * extend or acquire the primary lease if the client is eligible.
         */
        e.prototype.Lo = function() {
            var t = this;
            this.So = this.Is.Ss("client_metadata_refresh" /* ClientMetadataRefresh */ , 4e3, (function() {
                return t.xo().then((function() {
                    return t.Ho();
                })).then((function() {
                    return t.Lo();
                }));
            }));
        }, 
        /** Checks whether `client` is the local client. */ e.prototype.Go = function(t) {
            return !!t && t.ownerId === this.clientId;
        }, 
        /**
         * Evaluate the state of all active clients and determine whether the local
         * client is or can act as the holder of the primary lease. Returns whether
         * the client is eligible for the lease, but does not actually acquire it.
         * May return 'false' even if there is no active leaseholder and another
         * (foreground) client should become leaseholder instead.
         */
        e.prototype.Wo = function(t) {
            var e = this;
            return this.Vo ? Fn.resolve(!0) : yi(t).get(zr.key).next((function(n) {
                // A client is eligible for the primary lease if:
                // - its network is enabled and the client's tab is in the foreground.
                // - its network is enabled and no other client's tab is in the
                //   foreground.
                // - every clients network is disabled and the client's tab is in the
                //   foreground.
                // - every clients network is disabled and no other client's tab is in
                //   the foreground.
                // - the `forceOwningTab` setting was passed in.
                if (null !== n && e.Yo(n.leaseTimestampMs, 5e3) && !e.Zo(n.ownerId)) {
                    if (e.Go(n) && e.networkEnabled) return !0;
                    if (!e.Go(n)) {
                        if (!n.allowTabSynchronization) 
                        // Fail the `canActAsPrimary` check if the current leaseholder has
                        // not opted into multi-tab synchronization. If this happens at
                        // client startup, we reject the Promise returned by
                        // `enablePersistence()` and the user can continue to use Firestore
                        // with in-memory persistence.
                        // If this fails during a lease refresh, we will instead block the
                        // AsyncQueue from executing further operations. Note that this is
                        // acceptable since mixing & matching different `synchronizeTabs`
                        // settings is not supported.
                        // TODO(b/114226234): Remove this check when `synchronizeTabs` can
                        // no longer be turned off.
                        throw new x(D.FAILED_PRECONDITION, li);
                        return !1;
                    }
                }
                return !(!e.networkEnabled || !e.inForeground) || vi(t).Hs().next((function(t) {
                    return void 0 === e.Jo(t, 5e3).find((function(t) {
                        if (e.clientId !== t.clientId) {
                            var n = !e.networkEnabled && t.networkEnabled, r = !e.inForeground && t.inForeground, i = e.networkEnabled === t.networkEnabled;
                            if (n || r && i) return !0;
                        }
                        return !1;
                    }));
                }));
            })).next((function(t) {
                return e.isPrimary !== t && h("IndexedDbPersistence", "Client " + (t ? "is" : "is not") + " eligible for a primary lease."), 
                t;
            }));
        }, e.prototype.th = function() {
            return t.__awaiter(this, void 0, void 0, (function() {
                var e = this;
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        // Use `SimpleDb.runTransaction` directly to avoid failing if another tab
                        // has obtained the primary lease.
                        // The shutdown() operations are idempotent and can be called even when
                        // start() aborted (e.g. because it couldn't acquire the persistence lease).
                        return this.po = !1, this.eh(), this.So && (this.So.cancel(), this.So = null), this.nh(), 
                        this.sh(), [ 4 /*yield*/ , this.Fo.runTransaction("readwrite", [ zr.store, ri.store ], (function(t) {
                            var n = new pi(t, Wn.Es);
                            return e.jo(n).next((function() {
                                return e.zo(n);
                            }));
                        })) ];

                      case 1:
                        // The shutdown() operations are idempotent and can be called even when
                        // start() aborted (e.g. because it couldn't acquire the persistence lease).
                        // Use `SimpleDb.runTransaction` directly to avoid failing if another tab
                        // has obtained the primary lease.
                        return t.sent(), this.Fo.close(), 
                        // Remove the entry marking the client as zombied from LocalStorage since
                        // we successfully deleted its metadata from IndexedDb.
                        this.ih(), [ 2 /*return*/ ];
                    }
                }));
            }));
        }, 
        /**
         * Returns clients that are not zombied and have an updateTime within the
         * provided threshold.
         */
        e.prototype.Jo = function(t, e) {
            var n = this;
            return t.filter((function(t) {
                return n.Yo(t.updateTimeMs, e) && !n.Zo(t.clientId);
            }));
        }, 
        /**
         * Returns the IDs of the clients that are currently active. If multi-tab
         * is not supported, returns an array that only contains the local client's
         * ID.
         *
         * PORTING NOTE: This is only used for Web multi-tab.
         */
        e.prototype.rh = function() {
            var t = this;
            return this.runTransaction("getActiveClients", "readonly", (function(e) {
                return vi(e).Hs().next((function(e) {
                    return t.Jo(e, 18e5).map((function(t) {
                        return t.clientId;
                    }));
                }));
            }));
        }, Object.defineProperty(e.prototype, "tr", {
            get: function() {
                return this.po;
            },
            enumerable: !1,
            configurable: !0
        }), e.prototype.oh = function(t) {
            return xr.Tr(t, this.serializer, this.zn, this.dr);
        }, e.prototype.hh = function() {
            return this.ko;
        }, e.prototype.ah = function() {
            return this.Kn;
        }, e.prototype.uh = function() {
            return this.zn;
        }, e.prototype.runTransaction = function(t, e, n) {
            var r = this;
            h("IndexedDbPersistence", "Starting transaction:", t);
            var i, o = "readonly" === e ? "readonly" : "readwrite";
            // Do all transactions as readwrite against all object stores, since we
            // are the only reader/writer.
            return this.Fo.runTransaction(o, ii, (function(o) {
                return i = new pi(o, r.yo ? r.yo.next() : Wn.Es), "readwrite-primary" === e ? r.Qo(i).next((function(t) {
                    return !!t || r.Wo(i);
                })).next((function(e) {
                    if (!e) throw f("Failed to obtain primary lease for action '" + t + "'."), r.isPrimary = !1, 
                    r.Is.gi((function() {
                        return r.Co(!1);
                    })), new x(D.FAILED_PRECONDITION, jn);
                    return n(i);
                })).next((function(t) {
                    return r.Ko(i).next((function() {
                        return t;
                    }));
                })) : r.lh(i).next((function() {
                    return n(i);
                }));
            })).then((function(t) {
                return i.jn(), t;
            }));
        }, 
        /**
         * Verifies that the current tab is the primary leaseholder or alternatively
         * that the leaseholder has opted into multi-tab synchronization.
         */
        // TODO(b/114226234): Remove this check when `synchronizeTabs` can no longer
        // be turned off.
        e.prototype.lh = function(t) {
            var e = this;
            return yi(t).get(zr.key).next((function(t) {
                if (null !== t && e.Yo(t.leaseTimestampMs, 5e3) && !e.Zo(t.ownerId) && !e.Go(t) && !(e.Vo || e.allowTabSynchronization && t.allowTabSynchronization)) throw new x(D.FAILED_PRECONDITION, li);
            }));
        }, 
        /**
         * Obtains or extends the new primary lease for the local client. This
         * method does not verify that the client is eligible for this lease.
         */
        e.prototype.Ko = function(t) {
            var e = new zr(this.clientId, this.allowTabSynchronization, Date.now());
            return yi(t).put(zr.key, e);
        }, e.ks = function() {
            return Yn.ks();
        }, 
        /** Checks the primary lease and removes it if we are the current primary. */ e.prototype.jo = function(t) {
            var e = this, n = yi(t);
            return n.get(zr.key).next((function(t) {
                return e.Go(t) ? (h("IndexedDbPersistence", "Releasing primary lease."), n.delete(zr.key)) : Fn.resolve();
            }));
        }, 
        /** Verifies that `updateTimeMs` is within `maxAgeMs`. */ e.prototype.Yo = function(t, e) {
            var n = Date.now();
            return !(t < n - e || t > n && (f("Detected an update time that is in the future: " + t + " > " + n), 
            1));
        }, e.prototype.Oo = function() {
            var t = this;
            null !== this.document && "function" == typeof this.document.addEventListener && (this.vo = function() {
                t.Is.ai((function() {
                    return t.inForeground = "visible" === t.document.visibilityState, t.xo();
                }));
            }, this.document.addEventListener("visibilitychange", this.vo), this.inForeground = "visible" === this.document.visibilityState);
        }, e.prototype.nh = function() {
            this.vo && (this.document.removeEventListener("visibilitychange", this.vo), this.vo = null);
        }, 
        /**
         * Attaches a window.unload handler that will synchronously write our
         * clientId to a "zombie client id" location in LocalStorage. This can be used
         * by tabs trying to acquire the primary lease to determine that the lease
         * is no longer valid even if the timestamp is recent. This is particularly
         * important for the refresh case (so the tab correctly re-acquires the
         * primary lease). LocalStorage is used for this rather than IndexedDb because
         * it is a synchronous API and so can be used reliably from  an unload
         * handler.
         */
        e.prototype.Mo = function() {
            var t, e = this;
            "function" == typeof (null === (t = this.window) || void 0 === t ? void 0 : t.addEventListener) && (this.bo = function() {
                // Note: In theory, this should be scheduled on the AsyncQueue since it
                // accesses internal state. We execute this code directly during shutdown
                // to make sure it gets a chance to run.
                e.eh(), e.Is.ai((function() {
                    return e.th();
                }));
            }, this.window.addEventListener("unload", this.bo));
        }, e.prototype.sh = function() {
            this.bo && (this.window.removeEventListener("unload", this.bo), this.bo = null);
        }, 
        /**
         * Returns whether a client is "zombied" based on its LocalStorage entry.
         * Clients become zombied when their tab closes without running all of the
         * cleanup logic in `shutdown()`.
         */
        e.prototype.Zo = function(t) {
            var e;
            try {
                var n = null !== (null === (e = this.$o) || void 0 === e ? void 0 : e.getItem(this.Xo(t)));
                return h("IndexedDbPersistence", "Client '" + t + "' " + (n ? "is" : "is not") + " zombied in LocalStorage"), 
                n;
            } catch (t) {
                // Gracefully handle if LocalStorage isn't working.
                return f("IndexedDbPersistence", "Failed to get zombied client id.", t), !1;
            }
        }, 
        /**
         * Record client as zombied (a client that had its tab closed). Zombied
         * clients are ignored during primary tab selection.
         */
        e.prototype.eh = function() {
            if (this.$o) try {
                this.$o.setItem(this.Xo(this.clientId), String(Date.now()));
            } catch (t) {
                // Gracefully handle if LocalStorage isn't available / working.
                f("Failed to set zombie client id.", t);
            }
        }, 
        /** Removes the zombied client entry if it exists. */ e.prototype.ih = function() {
            if (this.$o) try {
                this.$o.removeItem(this.Xo(this.clientId));
            } catch (t) {
                // Ignore
            }
        }, e.prototype.Xo = function(t) {
            return "firestore_zombie_" + this.persistenceKey + "_" + t;
        }, e;
    }();

    /**
     * Oldest acceptable age in milliseconds for client metadata before the client
     * is considered inactive and its associated data is garbage collected.
     */
    /**
     * Helper to get a typed SimpleDbStore for the primary client object store.
     */
    function yi(t) {
        return di.Ms(t, zr.store);
    }

    /**
     * Helper to get a typed SimpleDbStore for the client metadata object store.
     */ function vi(t) {
        return di.Ms(t, ri.store);
    }

    /** Provides LRU functionality for IndexedDB persistence. */ var gi = /** @class */ function() {
        function t(t, e) {
            this.db = t, this.Yi = new dr(this, e);
        }
        return t.prototype.ir = function(t) {
            var e = this._h(t);
            return this.db.hh().do(t).next((function(t) {
                return e.next((function(e) {
                    return t + e;
                }));
            }));
        }, t.prototype._h = function(t) {
            var e = 0;
            return this.or(t, (function(t) {
                e++;
            })).next((function() {
                return e;
            }));
        }, t.prototype.be = function(t, e) {
            return this.db.hh().be(t, e);
        }, t.prototype.or = function(t, e) {
            return this.fh(t, (function(t, n) {
                return e(n);
            }));
        }, t.prototype.Eo = function(t, e, n) {
            return mi(t, n);
        }, t.prototype.mo = function(t, e, n) {
            return mi(t, n);
        }, t.prototype.hr = function(t, e, n) {
            return this.db.hh().hr(t, e, n);
        }, t.prototype.Dr = function(t, e) {
            return mi(t, e);
        }, 
        /**
         * Returns true if anything would prevent this document from being garbage
         * collected, given that the document in question is not present in any
         * targets and has a sequence number less than or equal to the upper bound for
         * the collection run.
         */
        t.prototype.dh = function(t, e) {
            return function(t, e) {
                var n = !1;
                return Or(t).ti((function(r) {
                    return kr(t, r, e).next((function(t) {
                        return t && (n = !0), Fn.resolve(!t);
                    }));
                })).next((function() {
                    return n;
                }));
            }(t, e);
        }, t.prototype.ar = function(t, e) {
            var n = this, r = this.db.ah().jr(), i = [], o = 0;
            return this.fh(t, (function(s, u) {
                if (u <= e) {
                    var a = n.dh(t, s).next((function(e) {
                        if (!e) 
                        // Our size accounting requires us to read all documents before
                        // removing them.
                        return o++, r.Ln(t, s).next((function() {
                            return r.Mn(s), fi(t).delete([ 0, yr(s.path) ]);
                        }));
                    }));
                    i.push(a);
                }
            })).next((function() {
                return Fn.Cn(i);
            })).next((function() {
                return r.apply(t);
            })).next((function() {
                return o;
            }));
        }, t.prototype.removeTarget = function(t, e) {
            var n = e.tt(t.Ro);
            return this.db.hh().lo(t, n);
        }, t.prototype.wh = function(t, e) {
            return mi(t, e);
        }, 
        /**
         * Call provided function for each document in the cache that is 'orphaned'. Orphaned
         * means not a part of any target, so the only entry in the target-document index for
         * that document will be the sentinel row (targetId 0), which will also have the sequence
         * number for the last time the document was accessed.
         */
        t.prototype.fh = function(t, e) {
            var n, r = fi(t), i = Wn.Es;
            return r.Zs({
                index: Jr.documentTargetsIndex
            }, (function(t, r) {
                var o = t[0], s = (t[1], r.path), u = r.sequenceNumber;
                0 === o ? (
                // if nextToReport is valid, report it, this is a new key so the
                // last one must not be a member of any targets.
                i !== Wn.Es && e(new U(mr(n)), i), 
                // set nextToReport to be this sequence number. It's the next one we
                // might report, if we don't find any targets for this document.
                // Note that the sequence number must be defined when the targetId
                // is 0.
                i = u, n = s) : 
                // set nextToReport to be invalid, we know we don't need to report
                // this one since we found a target for it.
                i = Wn.Es;
            })).next((function() {
                // Since we report sequence numbers after getting to the next key, we
                // need to check if the last key we iterated over was an orphaned
                // document and report it.
                i !== Wn.Es && e(new U(mr(n)), i);
            }));
        }, t.prototype.cr = function(t) {
            return this.db.ah().zr(t);
        }, t;
    }();

    function mi(t, e) {
        return fi(t).put(
        /**
     * @return A value suitable for writing a sentinel row in the target-document
     * store.
     */
        function(t, e) {
            return new Jr(0, yr(t.path), e);
        }(e, t.Ro));
    }

    /**
     * Generates a string used as a prefix when storing data in IndexedDB and
     * LocalStorage.
     */ function wi(t, e) {
        // Use two different prefix formats:
        //   * firestore / persistenceKey / projectID . databaseID / ...
        //   * firestore / persistenceKey / projectID / ...
        // projectIDs are DNS-compatible names and cannot contain dots
        // so there's no danger of collisions.
        var n = t.projectId;
        return t.i || (n += "." + t.database), "firestore/" + e + "/" + n + "/"
        /**
     * Implements `LocalStore` interface.
     *
     * Note: some field defined in this class might have public access level, but
     * the class is not exported so they are only accessible from this module.
     * This is useful to implement optional features (like bundles) in free
     * functions, such that they are tree-shakeable.
     */;
    }

    var bi = /** @class */ function() {
        function t(
        /** Manages our in-memory or durable persistence. */
        t, e, n) {
            this.persistence = t, this.Th = e, 
            /**
                 * Maps a targetID to data about its target.
                 *
                 * PORTING NOTE: We are using an immutable data structure on Web to make re-runs
                 * of `applyRemoteEvent()` idempotent.
                 */
            this.Eh = new $(w), 
            /** Maps a target to its targetID. */
            // TODO(wuandy): Evaluate if TargetId can be part of Target.
            this.Ih = new S((function(t) {
                return j(t);
            }), B), 
            /**
                 * The read time of the last entry processed by `getNewDocumentChanges()`.
                 *
                 * PORTING NOTE: This is only used for multi-tab synchronization.
                 */
            this.mh = L.min(), this.Gn = t.oh(n), this.Ah = t.ah(), this.ko = t.hh(), this.Rh = new zn(this.Ah, this.Gn, this.persistence.uh()), 
            this.Th.Ph(this.Rh);
        }
        return t.prototype.er = function(t) {
            var e = this;
            return this.persistence.runTransaction("Collect garbage", "readwrite-primary", (function(n) {
                return t.ur(n, e.Eh);
            }));
        }, t;
    }();

    /**
     * Acknowledges the given batch.
     *
     * On the happy path when a batch is acknowledged, the local store will
     *
     *  + remove the batch from the mutation queue;
     *  + apply the changes to the remote document cache;
     *  + recalculate the latency compensated view implied by those changes (there
     *    may be mutations in the queue that affect the documents but haven't been
     *    acknowledged yet); and
     *  + give the changed documents back the sync engine
     *
     * @returns The resulting (modified) documents.
     */ function _i(t, e) {
        var n = v(t);
        return n.persistence.runTransaction("Acknowledge batch", "readwrite-primary", (function(t) {
            var r = e.batch.keys(), i = n.Ah.jr({
                Gr: !0
            });
            return function(t, e, n, r) {
                var i = n.batch, o = i.keys(), s = Fn.resolve();
                return o.forEach((function(t) {
                    s = s.next((function() {
                        return r.Ln(e, t);
                    })).next((function(e) {
                        var o = e, s = n.Pn.get(t);
                        y(null !== s), (!o || o.version.o(s) < 0) && ((o = i.En(t, o, n)) && 
                        // We use the commitVersion as the readTime rather than the
                        // document's updateTime since the updateTime is not advanced
                        // for updates that do not modify the underlying document.
                        r.xn(o, n.Rn));
                    }));
                })), s.next((function() {
                    return t.Gn.br(e, i);
                }));
            }(n, t, e, i).next((function() {
                return i.apply(t);
            })).next((function() {
                return n.Gn.Cr(t);
            })).next((function() {
                return n.Rh.Zn(t, r);
            }));
        }));
    }

    /**
     * Removes mutations from the MutationQueue for the specified batch;
     * LocalDocuments will be recalculated.
     *
     * @returns The resulting modified documents.
     */
    /**
     * Returns the last consistent snapshot processed (used by the RemoteStore to
     * determine whether to buffer incoming snapshots from the backend).
     */ function Ii(t) {
        var e = v(t);
        return e.persistence.runTransaction("Get last remote snapshot version", "readonly", (function(t) {
            return e.ko.ro(t);
        }));
    }

    /**
     * Updates the "ground-state" (remote) documents. We assume that the remote
     * event reflects any write batches that have been acknowledged or rejected
     * (i.e. we do not re-apply local mutations to updates from this event).
     *
     * LocalDocuments are re-calculated if there are remaining mutations in the
     * queue.
     */ function Ei(t, e) {
        var n = v(t), r = e.Z, i = n.Eh;
        return n.persistence.runTransaction("Apply remote event", "readwrite-primary", (function(t) {
            var o = n.Ah.jr({
                Gr: !0
            });
            // Reset newTargetDataByTargetMap in case this transaction gets re-run.
                    i = n.Eh;
            var s = [];
            e.Wt.forEach((function(e, o) {
                var u = i.get(o);
                if (u) {
                    // Only update the remote keys if the target is still active. This
                    // ensures that we can persist the updated target data along with
                    // the updated assignment.
                    s.push(n.ko.Io(t, e.Zt, o).next((function() {
                        return n.ko.To(t, e.Jt, o);
                    })));
                    var a = e.resumeToken;
                    // Update the resume token if the change includes one.
                                    if (a.Y() > 0) {
                        var c = u.et(a, r).tt(t.Ro);
                        i = i.st(o, c), 
                        // Update the target data if there are target changes (or if
                        // sufficient time has passed since the last update).
                        /**
         * Returns true if the newTargetData should be persisted during an update of
         * an active target. TargetData should always be persisted when a target is
         * being released and should not call this function.
         *
         * While the target is active, TargetData updates can be omitted when nothing
         * about the target has changed except metadata like the resume token or
         * snapshot version. Occasionally it's worth the extra write to prevent these
         * values from getting too stale after a crash, but this doesn't have to be
         * too frequent.
         */
                        function(t, e, n) {
                            // Always persist target data if we don't already have a resume token.
                            return y(e.resumeToken.Y() > 0), 0 === t.resumeToken.Y() || (
                            // Don't allow resume token changes to be buffered indefinitely. This
                            // allows us to be reasonably up-to-date after a crash and avoids needing
                            // to loop over all active queries on shutdown. Especially in the browser
                            // we may not get time to do anything interesting while the current tab is
                            // closing.
                            e.Z.m() - t.Z.m() >= 3e8 || n.Jt.size + n.Xt.size + n.Zt.size > 0);
                        }(u, c, e) && s.push(n.ko.lo(t, c));
                    }
                }
            }));
            var u = it(), a = ht();
            // HACK: The only reason we allow a null snapshot version is so that we
            // can synthesize remote events when we get permission denied errors while
            // trying to resolve the state of a locally cached document that is in
            // limbo.
                    if (e.Kt.forEach((function(t, e) {
                a = a.add(t);
            })), 
            // Each loop iteration only affects its "own" doc, so it's safe to get all the remote
            // documents in advance in a single call.
            s.push(o.getEntries(t, a).next((function(i) {
                e.Kt.forEach((function(a, c) {
                    var f = i.get(a);
                    // Note: The order of the steps below is important, since we want
                    // to ensure that rejected limbo resolutions (which fabricate
                    // NoDocuments with SnapshotVersion.min()) never add documents to
                    // cache.
                                    c instanceof on && c.version.isEqual(L.min()) ? (
                    // NoDocuments with SnapshotVersion.min() are used in manufactured
                    // events. We remove these documents from cache since we lost
                    // access.
                    o.Mn(a, r), u = u.st(a, c)) : null == f || c.version.o(f.version) > 0 || 0 === c.version.o(f.version) && f.hasPendingWrites ? (o.xn(c, r), 
                    u = u.st(a, c)) : h("LocalStore", "Ignoring outdated watch update for ", a, ". Current version:", f.version, " Watch version:", c.version), 
                    e.Gt.has(a) && s.push(n.persistence.dr.wh(t, a));
                }));
            }))), !r.isEqual(L.min())) {
                var c = n.ko.ro(t).next((function(e) {
                    return n.ko.ho(t, t.Ro, r);
                }));
                s.push(c);
            }
            return Fn.Cn(s).next((function() {
                return o.apply(t);
            })).next((function() {
                return n.Rh.ts(t, u);
            }));
        })).then((function(t) {
            return n.Eh = i, t;
        }));
    }

    /**
     * Gets the mutation batch after the passed in batchId in the mutation queue
     * or null if empty.
     * @param afterBatchId If provided, the batch to search after.
     * @returns The next mutation or null if there wasn't one.
     */ function Ti(t, e) {
        var n = v(t);
        return n.persistence.runTransaction("Get next mutation batch", "readonly", (function(t) {
            return void 0 === e && (e = -1), n.Gn.gr(t, e);
        }));
    }

    /**
     * Reads the current value of a Document with a given key or null if not
     * found - used for testing.
     */
    /**
     * Assigns the given target an internal ID so that its results can be pinned so
     * they don't get GC'd. A target must be allocated in the local store before
     * the store can be used to manage its view.
     *
     * Allocating an already allocated `Target` will return the existing `TargetData`
     * for that `Target`.
     */ function Ni(t, e) {
        var n = v(t);
        return n.persistence.runTransaction("Allocate target", "readwrite", (function(t) {
            var r;
            return n.ko.wo(t, e).next((function(i) {
                return i ? (
                // This target has been listened to previously, so reuse the
                // previous targetID.
                // TODO(mcg): freshen last accessed date?
                r = i, Fn.resolve(r)) : n.ko.no(t).next((function(i) {
                    return r = new K(e, i, 0 /* Listen */ , t.Ro), n.ko.ao(t, r).next((function() {
                        return r;
                    }));
                }));
            }));
        })).then((function(t) {
            // If Multi-Tab is enabled, the existing target data may be newer than
            // the in-memory data
            var r = n.Eh.get(t.targetId);
            return (null === r || t.Z.o(r.Z) > 0) && (n.Eh = n.Eh.st(t.targetId, t), n.Ih.set(e, t.targetId)), 
            t;
        }));
    }

    /**
     * Returns the TargetData as seen by the LocalStore, including updates that may
     * have not yet been persisted to the TargetCache.
     */
    // Visible for testing.
    /**
     * Unpins all the documents associated with the given target. If
     * `keepPersistedTargetData` is set to false and Eager GC enabled, the method
     * directly removes the associated target data from the target cache.
     *
     * Releasing a non-existing `Target` is a no-op.
     */
    // PORTING NOTE: `keepPersistedTargetData` is multi-tab only.
    function Ai(e, n, r) {
        return t.__awaiter(this, void 0, void 0, (function() {
            var i, o, s, u;
            return t.__generator(this, (function(t) {
                switch (t.label) {
                  case 0:
                    i = v(e), o = i.Eh.get(n), s = r ? "readwrite" : "readwrite-primary", t.label = 1;

                  case 1:
                    return t.trys.push([ 1, 4, , 5 ]), r ? [ 3 /*break*/ , 3 ] : [ 4 /*yield*/ , i.persistence.runTransaction("Release target", s, (function(t) {
                        return i.persistence.dr.removeTarget(t, o);
                    })) ];

                  case 2:
                    t.sent(), t.label = 3;

                  case 3:
                    return [ 3 /*break*/ , 5 ];

                  case 4:
                    if (!$n(u = t.sent())) throw u;
                    // All `releaseTarget` does is record the final metadata state for the
                    // target, but we've been recording this periodically during target
                    // activity. If we lose this write this could cause a very slight
                    // difference in the order of target deletion during GC, but we
                    // don't define exact LRU semantics so this is acceptable.
                                    return h("LocalStore", "Failed to update sequence numbers for target " + n + ": " + u), 
                    [ 3 /*break*/ , 5 ];

                  case 5:
                    return i.Eh = i.Eh.remove(n), i.Ih.delete(o.target), [ 2 /*return*/ ];
                }
            }));
        }));
    }

    /**
     * Runs the specified query against the local store and returns the results,
     * potentially taking advantage of query data from previous executions (such
     * as the set of remote keys).
     *
     * @param usePreviousResults Whether results from previous executions can
     * be used to optimize this query execution.
     */ function Si(t, e, n) {
        var r = v(t), i = L.min(), o = ht();
        return r.persistence.runTransaction("Execute query", "readonly", (function(t) {
            return function(t, e, n) {
                var r = v(t), i = r.Ih.get(n);
                return void 0 !== i ? Fn.resolve(r.Eh.get(i)) : r.ko.wo(e, n);
            }(r, t, pn(e)).next((function(e) {
                if (e) return i = e.lastLimboFreeSnapshotVersion, r.ko.Ao(t, e.targetId).next((function(t) {
                    o = t;
                }));
            })).next((function() {
                return r.Th.ns(t, e, n ? i : L.min(), n ? o : ht());
            })).next((function(t) {
                return {
                    documents: t,
                    gh: o
                };
            }));
        }));
    }

    // PORTING NOTE: Multi-Tab only.
    function Di(t, e) {
        var n = v(t), r = v(n.ko), i = n.Eh.get(e);
        return i ? Promise.resolve(i.target) : n.persistence.runTransaction("Get target data", "readonly", (function(t) {
            return r.Me(t, e).next((function(t) {
                return t ? t.target : null;
            }));
        }));
    }

    /**
     * Returns the set of documents that have been updated since the last call.
     * If this is the first call, returns the set of changes since client
     * initialization. Further invocations will return document that have changed
     * since the prior call.
     */
    // PORTING NOTE: Multi-Tab only.
    /**
     * Verifies the error thrown by a LocalStore operation. If a LocalStore
     * operation fails because the primary lease has been taken by another client,
     * we ignore the error (the persistence layer will immediately call
     * `applyPrimaryLease` to propagate the primary state change). All other errors
     * are re-thrown.
     *
     * @param err An error returned by a LocalStore operation.
     * @return A Promise that resolves after we recovered, or the original error.
     */ function xi(e) {
        return t.__awaiter(this, void 0, void 0, (function() {
            return t.__generator(this, (function(t) {
                if (e.code !== D.FAILED_PRECONDITION || e.message !== jn) throw e;
                return h("LocalStore", "Unexpectedly lost primary lease"), [ 2 /*return*/ ];
            }));
        }));
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A collection of references to a document from some kind of numbered entity
     * (either a target ID or batch ID). As references are added to or removed from
     * the set corresponding events are emitted to a registered garbage collector.
     *
     * Each reference is represented by a DocumentReference object. Each of them
     * contains enough information to uniquely identify the reference. They are all
     * stored primarily in a set sorted by key. A document is considered garbage if
     * there's no references in that set (this can be efficiently checked thanks to
     * sorting by key).
     *
     * ReferenceSet also keeps a secondary set that contains references sorted by
     * IDs. This one is used to efficiently implement removal of all references by
     * some target ID.
     */ var ki = /** @class */ function() {
        function t() {
            // A set of outstanding references to a document sorted by key.
            this.Vh = new et(Li.yh), 
            // A set of outstanding references to a document sorted by target id.
            this.ph = new et(Li.bh)
            /** Returns true if the reference set contains no references. */;
        }
        return t.prototype._ = function() {
            return this.Vh._();
        }, 
        /** Adds a reference to the given document key for the given ID. */ t.prototype.Eo = function(t, e) {
            var n = new Li(t, e);
            this.Vh = this.Vh.add(n), this.ph = this.ph.add(n);
        }, 
        /** Add references to the given document keys for the given ID. */ t.prototype.vh = function(t, e) {
            var n = this;
            t.forEach((function(t) {
                return n.Eo(t, e);
            }));
        }, 
        /**
         * Removes a reference to the given document key for the given
         * ID.
         */
        t.prototype.mo = function(t, e) {
            this.Sh(new Li(t, e));
        }, t.prototype.Dh = function(t, e) {
            var n = this;
            t.forEach((function(t) {
                return n.mo(t, e);
            }));
        }, 
        /**
         * Clears all references with a given ID. Calls removeRef() for each key
         * removed.
         */
        t.prototype.Ch = function(t) {
            var e = this, n = new U(new P([])), r = new Li(n, t), i = new Li(n, t + 1), o = [];
            return this.ph.St([ r, i ], (function(t) {
                e.Sh(t), o.push(t.key);
            })), o;
        }, t.prototype.Nh = function() {
            var t = this;
            this.Vh.forEach((function(e) {
                return t.Sh(e);
            }));
        }, t.prototype.Sh = function(t) {
            this.Vh = this.Vh.delete(t), this.ph = this.ph.delete(t);
        }, t.prototype.Fh = function(t) {
            var e = new U(new P([])), n = new Li(e, t), r = new Li(e, t + 1), i = ht();
            return this.ph.St([ n, r ], (function(t) {
                i = i.add(t.key);
            })), i;
        }, t.prototype.Nr = function(t) {
            var e = new Li(t, 0), n = this.Vh.Ct(e);
            return null !== n && t.isEqual(n.key);
        }, t;
    }(), Li = /** @class */ function() {
        function t(t, e) {
            this.key = t, this.kh = e
            /** Compare by key then by ID */;
        }
        return t.yh = function(t, e) {
            return U.P(t.key, e.key) || w(t.kh, e.kh);
        }, 
        /** Compare by ID then by key */ t.bh = function(t, e) {
            return w(t.kh, e.kh) || U.P(t.key, e.key);
        }, t;
    }(), Ri = /** @class */ function() {
        function t(t) {
            this.uid = t;
        }
        return t.prototype.Er = function() {
            return null != this.uid;
        }, 
        /**
         * Returns a key representing this user, suitable for inclusion in a
         * dictionary.
         */
        t.prototype.$h = function() {
            return this.Er() ? "uid:" + this.uid : "anonymous-user";
        }, t.prototype.isEqual = function(t) {
            return t.uid === this.uid;
        }, t;
    }();

    /** A user with a null UID. */ Ri.UNAUTHENTICATED = new Ri(null), 
    // TODO(mikelehen): Look into getting a proper uid-equivalent for
    // non-FirebaseAuth providers.
    Ri.xh = new Ri("google-credentials-uid"), Ri.Oh = new Ri("first-party-uid");

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var Pi = function(t, e) {
        this.user = e, this.type = "OAuth", this.Mh = {}, 
        // Set the headers using Object Literal notation to avoid minification
        this.Mh.Authorization = "Bearer " + t;
    }, Oi = /** @class */ function() {
        function t() {
            /**
             * Stores the listener registered with setChangeListener()
             * This isn't actually necessary since the UID never changes, but we use this
             * to verify the listen contract is adhered to in tests.
             */
            this.Lh = null;
        }
        return t.prototype.getToken = function() {
            return Promise.resolve(null);
        }, t.prototype.qh = function() {}, t.prototype.Bh = function(t) {
            this.Lh = t, 
            // Fire with initial user.
            t(Ri.UNAUTHENTICATED);
        }, t.prototype.Uh = function() {
            this.Lh = null;
        }, t;
    }(), Vi = /** @class */ function() {
        function t(t) {
            var e = this;
            /**
             * The auth token listener registered with FirebaseApp, retained here so we
             * can unregister it.
             */        this.Qh = null, 
            /** Tracks the current User. */
            this.currentUser = Ri.UNAUTHENTICATED, this.Wh = !1, 
            /**
                 * Counter used to detect if the token changed while a getToken request was
                 * outstanding.
                 */
            this.jh = 0, 
            /** The listener registered with setChangeListener(). */
            this.Lh = null, this.forceRefresh = !1, this.Qh = function() {
                e.jh++, e.currentUser = e.Kh(), e.Wh = !0, e.Lh && e.Lh(e.currentUser);
            }, this.jh = 0, this.auth = t.getImmediate({
                optional: !0
            }), this.auth ? this.auth.addAuthTokenListener(this.Qh) : (
            // if auth is not available, invoke tokenListener once with null token
            this.Qh(null), t.get().then((function(t) {
                e.auth = t, e.Qh && 
                // tokenListener can be removed by removeChangeListener()
                e.auth.addAuthTokenListener(e.Qh);
            }), (function() {})));
        }
        return t.prototype.getToken = function() {
            var t = this, e = this.jh, n = this.forceRefresh;
            // Take note of the current value of the tokenCounter so that this method
            // can fail (with an ABORTED error) if there is a token change while the
            // request is outstanding.
                    return this.forceRefresh = !1, this.auth ? this.auth.getToken(n).then((function(n) {
                // Cancel the request since the token changed while the request was
                // outstanding so the response is potentially for a previous user (which
                // user, we can't be sure).
                return t.jh !== e ? (h("FirebaseCredentialsProvider", "getToken aborted due to token change."), 
                t.getToken()) : n ? (y("string" == typeof n.accessToken), new Pi(n.accessToken, t.currentUser)) : null;
            })) : Promise.resolve(null);
        }, t.prototype.qh = function() {
            this.forceRefresh = !0;
        }, t.prototype.Bh = function(t) {
            this.Lh = t, 
            // Fire the initial event
            this.Wh && t(this.currentUser);
        }, t.prototype.Uh = function() {
            this.auth && this.auth.removeAuthTokenListener(this.Qh), this.Qh = null, this.Lh = null;
        }, 
        // Auth.getUid() can return null even with a user logged in. It is because
        // getUid() is synchronous, but the auth code populating Uid is asynchronous.
        // This method should only be called in the AuthTokenListener callback
        // to guarantee to get the actual user.
        t.prototype.Kh = function() {
            var t = this.auth && this.auth.getUid();
            return y(null === t || "string" == typeof t), new Ri(t);
        }, t;
    }(), Ui = /** @class */ function() {
        function t(t, e) {
            this.Gh = t, this.zh = e, this.type = "FirstParty", this.user = Ri.Oh;
        }
        return Object.defineProperty(t.prototype, "Mh", {
            get: function() {
                var t = {
                    "X-Goog-AuthUser": this.zh
                }, e = this.Gh.auth.Hh([]);
                return e && (t.Authorization = e), t;
            },
            enumerable: !1,
            configurable: !0
        }), t;
    }(), Ci = /** @class */ function() {
        function t(t, e) {
            this.Gh = t, this.zh = e;
        }
        return t.prototype.getToken = function() {
            return Promise.resolve(new Ui(this.Gh, this.zh));
        }, t.prototype.Bh = function(t) {
            // Fire with initial uid.
            t(Ri.Oh);
        }, t.prototype.Uh = function() {}, t.prototype.qh = function() {}, t;
    }(), qi = /** @class */ function() {
        function e(t, e, n, r, i, o) {
            this.Is = t, this.Yh = n, this.Jh = r, this.Xh = i, this.listener = o, this.state = 0 /* Initial */ , 
            /**
                 * A close count that's incremented every time the stream is closed; used by
                 * getCloseGuardedDispatcher() to invalidate callbacks that happen after
                 * close.
                 */
            this.Zh = 0, this.ta = null, this.stream = null, this.Ti = new Kn(t, e)
            /**
         * Returns true if start() has been called and no error has occurred. True
         * indicates the stream is open or in the process of opening (which
         * encompasses respecting backoff, getting auth tokens, and starting the
         * actual RPC). Use isOpen() to determine if the stream is open and ready for
         * outbound requests.
         */;
        }
        return e.prototype.ea = function() {
            return 1 /* Starting */ === this.state || 2 /* Open */ === this.state || 4 /* Backoff */ === this.state;
        }, 
        /**
         * Returns true if the underlying RPC is open (the onOpen() listener has been
         * called) and the stream is ready for outbound requests.
         */
        e.prototype.na = function() {
            return 2 /* Open */ === this.state;
        }, 
        /**
         * Starts the RPC. Only allowed if isStarted() returns false. The stream is
         * not immediately ready for use: onOpen() will be invoked when the RPC is
         * ready for outbound requests, at which point isOpen() will return true.
         *
         * When start returns, isStarted() will return true.
         */
        e.prototype.start = function() {
            3 /* Error */ !== this.state ? this.auth() : this.sa();
        }, 
        /**
         * Stops the RPC. This call is idempotent and allowed regardless of the
         * current isStarted() state.
         *
         * When stop returns, isStarted() and isOpen() will both return false.
         */
        e.prototype.stop = function() {
            return t.__awaiter(this, void 0, void 0, (function() {
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        return this.ea() ? [ 4 /*yield*/ , this.close(0 /* Initial */) ] : [ 3 /*break*/ , 2 ];

                      case 1:
                        t.sent(), t.label = 2;

                      case 2:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        }, 
        /**
         * After an error the stream will usually back off on the next attempt to
         * start it. If the error warrants an immediate restart of the stream, the
         * sender can use this to indicate that the receiver should not back off.
         *
         * Each error will call the onClose() listener. That function can decide to
         * inhibit backoff if required.
         */
        e.prototype.ia = function() {
            this.state = 0 /* Initial */ , this.Ti.reset();
        }, 
        /**
         * Marks this stream as idle. If no further actions are performed on the
         * stream for one minute, the stream will automatically close itself and
         * notify the stream's onClose() handler with Status.OK. The stream will then
         * be in a !isStarted() state, requiring the caller to start the stream again
         * before further use.
         *
         * Only streams that are in state 'Open' can be marked idle, as all other
         * states imply pending network operations.
         */
        e.prototype.ra = function() {
            var t = this;
            // Starts the idle time if we are in state 'Open' and are not yet already
            // running a timer (in which case the previous idle timeout still applies).
                    this.na() && null === this.ta && (this.ta = this.Is.Ss(this.Yh, 6e4, (function() {
                return t.oa();
            })));
        }, 
        /** Sends a message to the underlying stream. */ e.prototype.ha = function(t) {
            this.aa(), this.stream.send(t);
        }, 
        /** Called by the idle timer when the stream should close due to inactivity. */ e.prototype.oa = function() {
            return t.__awaiter(this, void 0, void 0, (function() {
                return t.__generator(this, (function(t) {
                    return this.na() ? [ 2 /*return*/ , this.close(0 /* Initial */) ] : [ 2 /*return*/ ];
                }));
            }));
        }, 
        /** Marks the stream as active again. */ e.prototype.aa = function() {
            this.ta && (this.ta.cancel(), this.ta = null);
        }, 
        /**
         * Closes the stream and cleans up as necessary:
         *
         * * closes the underlying GRPC stream;
         * * calls the onClose handler with the given 'error';
         * * sets internal stream state to 'finalState';
         * * adjusts the backoff timer based on the error
         *
         * A new stream can be opened by calling start().
         *
         * @param finalState the intended state of the stream after closing.
         * @param error the error the connection was closed with.
         */
        e.prototype.close = function(e, n) {
            return t.__awaiter(this, void 0, void 0, (function() {
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        // Notify the listener that the stream closed.
                        // Cancel any outstanding timers (they're guaranteed not to execute).
                        return this.aa(), this.Ti.cancel(), 
                        // Invalidates any stream-related callbacks (e.g. from auth or the
                        // underlying stream), guaranteeing they won't execute.
                        this.Zh++, 3 /* Error */ !== e ? 
                        // If this is an intentional close ensure we don't delay our next connection attempt.
                        this.Ti.reset() : n && n.code === D.RESOURCE_EXHAUSTED ? (
                        // Log the error. (Probably either 'quota exceeded' or 'max queue length reached'.)
                        f(n.toString()), f("Using maximum backoff delay to prevent overloading the backend."), 
                        this.Ti.ps()) : n && n.code === D.UNAUTHENTICATED && 
                        // "unauthenticated" error means the token was rejected. Try force refreshing it in case it
                        // just expired.
                        this.Xh.qh(), 
                        // Clean up the underlying stream because we are no longer interested in events.
                        null !== this.stream && (this.ua(), this.stream.close(), this.stream = null), 
                        // This state must be assigned before calling onClose() to allow the callback to
                        // inhibit backoff or otherwise manipulate the state in its non-started state.
                        this.state = e, [ 4 /*yield*/ , this.listener.ca(n) ];

                      case 1:
                        // Cancel any outstanding timers (they're guaranteed not to execute).
                        // Notify the listener that the stream closed.
                        return t.sent(), [ 2 /*return*/ ];
                    }
                }));
            }));
        }, 
        /**
         * Can be overridden to perform additional cleanup before the stream is closed.
         * Calling super.tearDown() is not required.
         */
        e.prototype.ua = function() {}, e.prototype.auth = function() {
            var t = this;
            this.state = 1 /* Starting */;
            var e = this.la(this.Zh), n = this.Zh;
            // TODO(mikelehen): Just use dispatchIfNotClosed, but see TODO below.
                    this.Xh.getToken().then((function(e) {
                // Stream can be stopped while waiting for authentication.
                // TODO(mikelehen): We really should just use dispatchIfNotClosed
                // and let this dispatch onto the queue, but that opened a spec test can
                // of worms that I don't want to deal with in this PR.
                t.Zh === n && 
                // Normally we'd have to schedule the callback on the AsyncQueue.
                // However, the following calls are safe to be called outside the
                // AsyncQueue since they don't chain asynchronous calls
                t._a(e);
            }), (function(n) {
                e((function() {
                    var e = new x(D.UNKNOWN, "Fetching auth token failed: " + n.message);
                    return t.fa(e);
                }));
            }));
        }, e.prototype._a = function(t) {
            var e = this, n = this.la(this.Zh);
            this.stream = this.da(t), this.stream.wa((function() {
                n((function() {
                    return e.state = 2 /* Open */ , e.listener.wa();
                }));
            })), this.stream.ca((function(t) {
                n((function() {
                    return e.fa(t);
                }));
            })), this.stream.onMessage((function(t) {
                n((function() {
                    return e.onMessage(t);
                }));
            }));
        }, e.prototype.sa = function() {
            var e = this;
            this.state = 4 /* Backoff */ , this.Ti.bs((function() {
                return t.__awaiter(e, void 0, void 0, (function() {
                    return t.__generator(this, (function(t) {
                        return this.state = 0 /* Initial */ , this.start(), [ 2 /*return*/ ];
                    }));
                }));
            }));
        }, 
        // Visible for tests
        e.prototype.fa = function(t) {
            // In theory the stream could close cleanly, however, in our current model
            // we never expect this to happen because if we stop a stream ourselves,
            // this callback will never be called. To prevent cases where we retry
            // without a backoff accidentally, we set the stream to error in all cases.
            return h("PersistentStream", "close with error: " + t), this.stream = null, this.close(3 /* Error */ , t);
        }, 
        /**
         * Returns a "dispatcher" function that dispatches operations onto the
         * AsyncQueue but only runs them if closeCount remains unchanged. This allows
         * us to turn auth / stream callbacks into no-ops if the stream is closed /
         * re-opened, etc.
         */
        e.prototype.la = function(t) {
            var e = this;
            return function(n) {
                e.Is.ai((function() {
                    return e.Zh === t ? n() : (h("PersistentStream", "stream callback skipped by getCloseGuardedDispatcher."), 
                    Promise.resolve());
                }));
            };
        }, e;
    }(), Mi = /** @class */ function(e) {
        function n(t, n, r, i, o) {
            var s = this;
            return (s = e.call(this, t, "listen_stream_connection_backoff" /* ListenStreamConnectionBackoff */ , "listen_stream_idle" /* ListenStreamIdle */ , n, r, o) || this).serializer = i, 
            s;
        }
        return t.__extends(n, e), n.prototype.da = function(t) {
            return this.Jh.Ta("Listen", t);
        }, n.prototype.onMessage = function(t) {
            // A successful response means the stream is healthy
            this.Ti.reset();
            var e = function(t, e) {
                var n;
                if ("targetChange" in e) {
                    e.targetChange;
                    // proto3 default value is unset in JSON (undefined), so use 'NO_CHANGE'
                    // if unset
                    var r = function(t) {
                        return "NO_CHANGE" === t ? 0 /* NoChange */ : "ADD" === t ? 1 /* Added */ : "REMOVE" === t ? 2 /* Removed */ : "CURRENT" === t ? 3 /* Current */ : "RESET" === t ? 4 /* Reset */ : d();
                    }(e.targetChange.targetChangeType || "NO_CHANGE"), i = e.targetChange.targetIds || [], o = function(t, e) {
                        return t.Le ? (y(void 0 === e || "string" == typeof e), Q.fromBase64String(e || "")) : (y(void 0 === e || e instanceof Uint8Array), 
                        Q.fromUint8Array(e || new Uint8Array));
                    }(t, e.targetChange.resumeToken), s = e.targetChange.cause, u = s && function(t) {
                        var e = void 0 === t.code ? D.UNKNOWN : X(t.code);
                        return new x(e, t.message || "");
                    }(s);
                    n = new bt(r, i, o, u || null);
                } else if ("documentChange" in e) {
                    e.documentChange;
                    var a = e.documentChange;
                    a.document, a.document.name, a.document.updateTime;
                    var c = ne(t, a.document.name), h = $t(a.document.updateTime), f = new Je({
                        mapValue: {
                            fields: a.document.fields
                        }
                    }), l = new rn(c, h, f, {}), p = a.targetIds || [], v = a.removedTargetIds || [];
                    n = new mt(p, v, l.key, l);
                } else if ("documentDelete" in e) {
                    e.documentDelete;
                    var g = e.documentDelete;
                    g.document;
                    var m = ne(t, g.document), w = g.readTime ? $t(g.readTime) : L.min(), b = new on(m, w), _ = g.removedTargetIds || [];
                    n = new mt([], _, b.key, b);
                } else if ("documentRemove" in e) {
                    e.documentRemove;
                    var I = e.documentRemove;
                    I.document;
                    var E = ne(t, I.document), T = I.removedTargetIds || [];
                    n = new mt([], T, E, null);
                } else {
                    if (!("filter" in e)) return d();
                    e.filter;
                    var N = e.filter;
                    N.targetId;
                    var A = N.count || 0, S = new Y(A), k = N.targetId;
                    n = new wt(k, S);
                }
                return n;
            }(this.serializer, t), n = function(t) {
                // We have only reached a consistent snapshot for the entire stream if there
                // is a read_time set and it applies to all targets (i.e. the list of
                // targets is empty). The backend is guaranteed to send such responses.
                if (!("targetChange" in t)) return L.min();
                var e = t.targetChange;
                return e.targetIds && e.targetIds.length ? L.min() : e.readTime ? $t(e.readTime) : L.min();
            }(t);
            return this.listener.Ea(e, n);
        }, 
        /**
         * Registers interest in the results of the given target. If the target
         * includes a resumeToken it will be included in the request. Results that
         * affect the target will be streamed back as WatchChange messages that
         * reference the targetId.
         */
        n.prototype.Ia = function(t) {
            var e = {};
            e.database = oe(this.serializer), e.addTarget = function(t, e) {
                var n, r = e.target;
                return (n = z(r) ? {
                    documents: he(t, r)
                } : {
                    query: fe(t, r)
                }).targetId = e.targetId, e.resumeToken.Y() > 0 && (n.resumeToken = Zt(t, e.resumeToken)), 
                n;
            }(this.serializer, t);
            var n = function(t, e) {
                var n = function(t, e) {
                    switch (e) {
                      case 0 /* Listen */ :
                        return null;

                      case 1 /* ExistenceFilterMismatch */ :
                        return "existence-filter-mismatch";

                      case 2 /* LimboResolution */ :
                        return "limbo-document";

                      default:
                        return d();
                    }
                }(0, e.X);
                return null == n ? null : {
                    "goog-listen-tags": n
                };
            }(this.serializer, t);
            n && (e.labels = n), this.ha(e);
        }, 
        /**
         * Unregisters interest in the results of the target associated with the
         * given targetId.
         */
        n.prototype.ma = function(t) {
            var e = {};
            e.database = oe(this.serializer), e.removeTarget = t, this.ha(e);
        }, n;
    }(qi), Fi = /** @class */ function(e) {
        function n(t, n, r, i, o) {
            var s = this;
            return (s = e.call(this, t, "write_stream_connection_backoff" /* WriteStreamConnectionBackoff */ , "write_stream_idle" /* WriteStreamIdle */ , n, r, o) || this).serializer = i, 
            s.Aa = !1, s;
        }
        return t.__extends(n, e), Object.defineProperty(n.prototype, "Ra", {
            /**
             * Tracks whether or not a handshake has been successfully exchanged and
             * the stream is ready to accept mutations.
             */
            get: function() {
                return this.Aa;
            },
            enumerable: !1,
            configurable: !0
        }), 
        // Override of PersistentStream.start
        n.prototype.start = function() {
            this.Aa = !1, this.lastStreamToken = void 0, e.prototype.start.call(this);
        }, n.prototype.ua = function() {
            this.Aa && this.Pa([]);
        }, n.prototype.da = function(t) {
            return this.Jh.Ta("Write", t);
        }, n.prototype.onMessage = function(t) {
            if (
            // Always capture the last stream token.
            y(!!t.streamToken), this.lastStreamToken = t.streamToken, this.Aa) {
                // A successful first write response means the stream is healthy,
                // Note, that we could consider a successful handshake healthy, however,
                // the write itself might be causing an error we want to back off from.
                this.Ti.reset();
                var e = function(t, e) {
                    return t && t.length > 0 ? (y(void 0 !== e), t.map((function(t) {
                        return function(t, e) {
                            // NOTE: Deletes don't have an updateTime.
                            var n = t.updateTime ? $t(t.updateTime) : $t(e);
                            n.isEqual(L.min()) && (
                            // The Firestore Emulator currently returns an update time of 0 for
                            // deletes of non-existing documents (rather than null). This breaks the
                            // test "get deleted doc while offline with source=cache" as NoDocuments
                            // with version 0 are filtered by IndexedDb's RemoteDocumentCache.
                            // TODO(#2149): Remove this when Emulator is fixed
                            n = $t(e));
                            var r = null;
                            return t.transformResults && t.transformResults.length > 0 && (r = t.transformResults), 
                            new Ue(n, r);
                        }(t, e);
                    }))) : [];
                }(t.writeResults, t.commitTime), n = $t(t.commitTime);
                return this.listener.ga(n, e);
            }
            // The first response is always the handshake response
                    return y(!t.writeResults || 0 === t.writeResults.length), this.Aa = !0, 
            this.listener.Va();
        }, 
        /**
         * Sends an initial streamToken to the server, performing the handshake
         * required to make the StreamingWrite RPC work. Subsequent
         * calls should wait until onHandshakeComplete was called.
         */
        n.prototype.ya = function() {
            // TODO(dimond): Support stream resumption. We intentionally do not set the
            // stream token on the handshake, ignoring any stream token we might have.
            var t = {};
            t.database = oe(this.serializer), this.ha(t);
        }, 
        /** Sends a group of mutations to the Firestore backend to apply. */ n.prototype.Pa = function(t) {
            var e = this, n = {
                streamToken: this.lastStreamToken,
                writes: t.map((function(t) {
                    return ae(e.serializer, t);
                }))
            };
            this.ha(n);
        }, n;
    }(qi), Gi = /** @class */ function(e) {
        function n(t, n, r) {
            var i = this;
            return (i = e.call(this) || this).credentials = t, i.Jh = n, i.serializer = r, i.pa = !1, 
            i;
        }
        return t.__extends(n, e), n.prototype.ba = function() {
            if (this.pa) throw new x(D.FAILED_PRECONDITION, "The client has already been terminated.");
        }, 
        /** Gets an auth token and invokes the provided RPC. */ n.prototype.va = function(t, e, n) {
            var r = this;
            return this.ba(), this.credentials.getToken().then((function(i) {
                return r.Jh.va(t, e, n, i);
            })).catch((function(t) {
                throw t.code === D.UNAUTHENTICATED && r.credentials.qh(), t;
            }));
        }, 
        /** Gets an auth token and invokes the provided RPC with streamed results. */ n.prototype.Sa = function(t, e, n) {
            var r = this;
            return this.ba(), this.credentials.getToken().then((function(i) {
                return r.Jh.Sa(t, e, n, i);
            })).catch((function(t) {
                throw t.code === D.UNAUTHENTICATED && r.credentials.qh(), t;
            }));
        }, n.prototype.terminate = function() {
            this.pa = !1;
        }, n;
    }((function() {})), ji = /** @class */ function() {
        function t(t, e) {
            this.ei = t, this.Da = e, 
            /** The current OnlineState. */
            this.state = "Unknown" /* Unknown */ , 
            /**
                 * A count of consecutive failures to open the stream. If it reaches the
                 * maximum defined by MAX_WATCH_STREAM_FAILURES, we'll set the OnlineState to
                 * Offline.
                 */
            this.Ca = 0, 
            /**
                 * A timer that elapses after ONLINE_STATE_TIMEOUT_MS, at which point we
                 * transition from OnlineState.Unknown to OnlineState.Offline without waiting
                 * for the stream to actually fail (MAX_WATCH_STREAM_FAILURES times).
                 */
            this.Na = null, 
            /**
                 * Whether the client should log a warning message if it fails to connect to
                 * the backend (initially true, cleared after a successful stream, or if we've
                 * logged the message already).
                 */
            this.Fa = !0
            /**
         * Called by RemoteStore when a watch stream is started (including on each
         * backoff attempt).
         *
         * If this is the first attempt, it sets the OnlineState to Unknown and starts
         * the onlineStateTimer.
         */;
        }
        return t.prototype.ka = function() {
            var t = this;
            0 === this.Ca && (this.$a("Unknown" /* Unknown */), this.Na = this.ei.Ss("online_state_timeout" /* OnlineStateTimeout */ , 1e4, (function() {
                return t.Na = null, t.xa("Backend didn't respond within 10 seconds."), t.$a("Offline" /* Offline */), 
                Promise.resolve();
            })));
        }, 
        /**
         * Updates our OnlineState as appropriate after the watch stream reports a
         * failure. The first failure moves us to the 'Unknown' state. We then may
         * allow multiple failures (based on MAX_WATCH_STREAM_FAILURES) before we
         * actually transition to the 'Offline' state.
         */
        t.prototype.Oa = function(t) {
            "Online" /* Online */ === this.state ? this.$a("Unknown" /* Unknown */) : (this.Ca++, 
            this.Ca >= 1 && (this.Ma(), this.xa("Connection failed 1 times. Most recent error: " + t.toString()), 
            this.$a("Offline" /* Offline */)));
        }, 
        /**
         * Explicitly sets the OnlineState to the specified state.
         *
         * Note that this resets our timers / failure counters, etc. used by our
         * Offline heuristics, so must not be used in place of
         * handleWatchStreamStart() and handleWatchStreamFailure().
         */
        t.prototype.set = function(t) {
            this.Ma(), this.Ca = 0, "Online" /* Online */ === t && (
            // We've connected to watch at least once. Don't warn the developer
            // about being offline going forward.
            this.Fa = !1), this.$a(t);
        }, t.prototype.$a = function(t) {
            t !== this.state && (this.state = t, this.Da(t));
        }, t.prototype.xa = function(t) {
            var e = "Could not reach Cloud Firestore backend. " + t + "\nThis typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.";
            this.Fa ? (f(e), this.Fa = !1) : h("OnlineStateTracker", e);
        }, t.prototype.Ma = function() {
            null !== this.Na && (this.Na.cancel(), this.Na = null);
        }, t;
    }(), Bi = /** @class */ function() {
        function e(
        /**
         * The local store, used to fill the write pipeline with outbound mutations.
         */
        e, 
        /** The client-side proxy for interacting with the backend. */
        n, r, i, o) {
            var s = this;
            this.La = e, this.qa = n, this.ei = r, 
            /**
                 * A list of up to MAX_PENDING_WRITES writes that we have fetched from the
                 * LocalStore via fillWritePipeline() and have or will send to the write
                 * stream.
                 *
                 * Whenever writePipeline.length > 0 the RemoteStore will attempt to start or
                 * restart the write stream. When the stream is established the writes in the
                 * pipeline will be sent in order.
                 *
                 * Writes remain in writePipeline until they are acknowledged by the backend
                 * and thus will automatically be re-sent if the stream is interrupted /
                 * restarted before they're acknowledged.
                 *
                 * Write responses from the backend are linked to their originating request
                 * purely based on order, and so we can just shift() writes from the front of
                 * the writePipeline as we receive responses.
                 */
            this.Ba = [], 
            /**
                 * A mapping of watched targets that the client cares about tracking and the
                 * user has explicitly called a 'listen' for this target.
                 *
                 * These targets may or may not have been sent to or acknowledged by the
                 * server. On re-establishing the listen stream, these targets should be sent
                 * to the server. The targets removed with unlistens are removed eagerly
                 * without waiting for confirmation from the listen stream.
                 */
            this.Ua = new Map, this.Qa = null, 
            /**
                 * A set of reasons for why the RemoteStore may be offline. If empty, the
                 * RemoteStore may start its network connections.
                 */
            this.Wa = new Set, this.ja = o, this.ja.Ka((function(e) {
                r.ai((function() {
                    return t.__awaiter(s, void 0, void 0, (function() {
                        return t.__generator(this, (function(t) {
                            switch (t.label) {
                              case 0:
                                return this.Ga() ? (h("RemoteStore", "Restarting streams for network reachability change."), 
                                [ 4 /*yield*/ , this.za() ]) : [ 3 /*break*/ , 2 ];

                              case 1:
                                t.sent(), t.label = 2;

                              case 2:
                                return [ 2 /*return*/ ];
                            }
                        }));
                    }));
                }));
            })), this.Ha = new ji(r, i), 
            // Create streams (but note they're not started yet).
            this.Ya = function(t, e, n) {
                var r = v(t);
                return r.ba(), new Mi(e, r.Jh, r.credentials, r.serializer, n);
            }(this.qa, r, {
                wa: this.Ja.bind(this),
                ca: this.Xa.bind(this),
                Ea: this.Za.bind(this)
            }), this.tu = function(t, e, n) {
                var r = v(t);
                return r.ba(), new Fi(e, r.Jh, r.credentials, r.serializer, n);
            }(this.qa, r, {
                wa: this.eu.bind(this),
                ca: this.nu.bind(this),
                Va: this.su.bind(this),
                ga: this.ga.bind(this)
            });
        }
        /**
         * Starts up the remote store, creating streams, restoring state from
         * LocalStore, etc.
         */    return e.prototype.start = function() {
            return this.enableNetwork();
        }, 
        /** Re-enables the network. Idempotent. */ e.prototype.enableNetwork = function() {
            return this.Wa.delete(0 /* UserDisabled */), this.iu();
        }, e.prototype.iu = function() {
            return t.__awaiter(this, void 0, void 0, (function() {
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        return this.Ga() ? (this.ru() ? this.ou() : this.Ha.set("Unknown" /* Unknown */), 
                        [ 4 /*yield*/ , this.hu() ]) : [ 3 /*break*/ , 2 ];

                      case 1:
                        // This will start the write stream if necessary.
                        t.sent(), t.label = 2;

                      case 2:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        }, 
        /**
         * Temporarily disables the network. The network can be re-enabled using
         * enableNetwork().
         */
        e.prototype.disableNetwork = function() {
            return t.__awaiter(this, void 0, void 0, (function() {
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        return this.Wa.add(0 /* UserDisabled */), [ 4 /*yield*/ , this.au() ];

                      case 1:
                        return t.sent(), 
                        // Set the OnlineState to Offline so get()s return from cache, etc.
                        this.Ha.set("Offline" /* Offline */), [ 2 /*return*/ ];
                    }
                }));
            }));
        }, e.prototype.au = function() {
            return t.__awaiter(this, void 0, void 0, (function() {
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        return [ 4 /*yield*/ , this.tu.stop() ];

                      case 1:
                        return t.sent(), [ 4 /*yield*/ , this.Ya.stop() ];

                      case 2:
                        return t.sent(), this.Ba.length > 0 && (h("RemoteStore", "Stopping write stream with " + this.Ba.length + " pending writes"), 
                        this.Ba = []), this.uu(), [ 2 /*return*/ ];
                    }
                }));
            }));
        }, e.prototype.th = function() {
            return t.__awaiter(this, void 0, void 0, (function() {
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        return h("RemoteStore", "RemoteStore shutting down."), this.Wa.add(5 /* Shutdown */), 
                        [ 4 /*yield*/ , this.au() ];

                      case 1:
                        return t.sent(), this.ja.th(), 
                        // Set the OnlineState to Unknown (rather than Offline) to avoid potentially
                        // triggering spurious listener events with cached data, etc.
                        this.Ha.set("Unknown" /* Unknown */), [ 2 /*return*/ ];
                    }
                }));
            }));
        }, 
        /**
         * Starts new listen for the given target. Uses resume token if provided. It
         * is a no-op if the target of given `TargetData` is already being listened to.
         */
        e.prototype.listen = function(t) {
            this.Ua.has(t.targetId) || (
            // Mark this as something the client is currently listening for.
            this.Ua.set(t.targetId, t), this.ru() ? 
            // The listen will be sent in onWatchStreamOpen
            this.ou() : this.Ya.na() && this.cu(t));
        }, 
        /**
         * Removes the listen from server. It is a no-op if the given target id is
         * not being listened to.
         */
        e.prototype.lu = function(t) {
            this.Ua.delete(t), this.Ya.na() && this._u(t), 0 === this.Ua.size && (this.Ya.na() ? this.Ya.ra() : this.Ga() && 
            // Revert to OnlineState.Unknown if the watch stream is not open and we
            // have no listeners, since without any listens to send we cannot
            // confirm if the stream is healthy and upgrade to OnlineState.Online.
            this.Ha.set("Unknown" /* Unknown */));
        }, 
        /** {@link TargetMetadataProvider.getTargetDataForTarget} */ e.prototype.Me = function(t) {
            return this.Ua.get(t) || null;
        }, 
        /** {@link TargetMetadataProvider.getRemoteKeysForTarget} */ e.prototype.Oe = function(t) {
            return this.fu.Oe(t);
        }, 
        /**
         * We need to increment the the expected number of pending responses we're due
         * from watch so we wait for the ack to process any messages from this target.
         */
        e.prototype.cu = function(t) {
            this.Qa.we(t.targetId), this.Ya.Ia(t);
        }, 
        /**
         * We need to increment the expected number of pending responses we're due
         * from watch so we wait for the removal on the server before we process any
         * messages from this target.
         */
        e.prototype._u = function(t) {
            this.Qa.we(t), this.Ya.ma(t);
        }, e.prototype.ou = function() {
            this.Qa = new It(this), this.Ya.start(), this.Ha.ka();
        }, 
        /**
         * Returns whether the watch stream should be started because it's necessary
         * and has not yet been started.
         */
        e.prototype.ru = function() {
            return this.Ga() && !this.Ya.ea() && this.Ua.size > 0;
        }, e.prototype.Ga = function() {
            return 0 === this.Wa.size;
        }, e.prototype.uu = function() {
            this.Qa = null;
        }, e.prototype.Ja = function() {
            return t.__awaiter(this, void 0, void 0, (function() {
                var e = this;
                return t.__generator(this, (function(t) {
                    return this.Ua.forEach((function(t, n) {
                        e.cu(t);
                    })), [ 2 /*return*/ ];
                }));
            }));
        }, e.prototype.Xa = function(e) {
            return t.__awaiter(this, void 0, void 0, (function() {
                return t.__generator(this, (function(t) {
                    return this.uu(), 
                    // If we still need the watch stream, retry the connection.
                    this.ru() ? (this.Ha.Oa(e), this.ou()) : 
                    // No need to restart watch stream because there are no active targets.
                    // The online state is set to unknown because there is no active attempt
                    // at establishing a connection
                    this.Ha.set("Unknown" /* Unknown */), [ 2 /*return*/ ];
                }));
            }));
        }, e.prototype.Za = function(e, n) {
            return t.__awaiter(this, void 0, void 0, (function() {
                var r, i, o;
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        if (this.Ha.set("Online" /* Online */), !(e instanceof bt && 2 /* Removed */ === e.state && e.cause)) 
                        // Mark the client as online since we got a message from the server
                        return [ 3 /*break*/ , 6 ];
                        t.label = 1;

                      case 1:
                        return t.trys.push([ 1, 3, , 5 ]), [ 4 /*yield*/ , this.du(e) ];

                      case 2:
                        return t.sent(), [ 3 /*break*/ , 5 ];

                      case 3:
                        return r = t.sent(), h("RemoteStore", "Failed to remove targets %s: %s ", e.targetIds.join(","), r), 
                        [ 4 /*yield*/ , this.wu(r) ];

                      case 4:
                        return t.sent(), [ 3 /*break*/ , 5 ];

                      case 5:
                        return [ 3 /*break*/ , 13 ];

                      case 6:
                        if (e instanceof mt ? this.Qa.ge(e) : e instanceof wt ? this.Qa.Ce(e) : this.Qa.pe(e), 
                        n.isEqual(L.min())) return [ 3 /*break*/ , 13 ];
                        t.label = 7;

                      case 7:
                        return t.trys.push([ 7, 11, , 13 ]), [ 4 /*yield*/ , Ii(this.La) ];

                      case 8:
                        return i = t.sent(), n.o(i) >= 0 ? [ 4 /*yield*/ , this.Tu(n) ] : [ 3 /*break*/ , 10 ];

                        // We have received a target change with a global snapshot if the snapshot
                        // version is not equal to SnapshotVersion.min().
                                          case 9:
                        // We have received a target change with a global snapshot if the snapshot
                        // version is not equal to SnapshotVersion.min().
                        t.sent(), t.label = 10;

                      case 10:
                        return [ 3 /*break*/ , 13 ];

                      case 11:
                        return h("RemoteStore", "Failed to raise snapshot:", o = t.sent()), [ 4 /*yield*/ , this.wu(o) ];

                      case 12:
                        return t.sent(), [ 3 /*break*/ , 13 ];

                      case 13:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        }, 
        /**
         * Recovery logic for IndexedDB errors that takes the network offline until
         * `op` succeeds. Retries are scheduled with backoff using
         * `enqueueRetryable()`. If `op()` is not provided, IndexedDB access is
         * validated via a generic operation.
         *
         * The returned Promise is resolved once the network is disabled and before
         * any retry attempt.
         */
        e.prototype.wu = function(e, n) {
            return t.__awaiter(this, void 0, void 0, (function() {
                var r = this;
                return t.__generator(this, (function(i) {
                    switch (i.label) {
                      case 0:
                        if (!$n(e)) throw e;
                        // Disable network and raise offline snapshots
                        return this.Wa.add(1 /* IndexedDbFailed */), [ 4 /*yield*/ , this.au() ];

                      case 1:
                        // Disable network and raise offline snapshots
                        return i.sent(), this.Ha.set("Offline" /* Offline */), n || (
                        // Use a simple read operation to determine if IndexedDB recovered.
                        // Ideally, we would expose a health check directly on SimpleDb, but
                        // RemoteStore only has access to persistence through LocalStore.
                        n = function() {
                            return Ii(r.La);
                        }), 
                        // Probe IndexedDB periodically and re-enable network
                        this.ei.gi((function() {
                            return t.__awaiter(r, void 0, void 0, (function() {
                                return t.__generator(this, (function(t) {
                                    switch (t.label) {
                                      case 0:
                                        return h("RemoteStore", "Retrying IndexedDB access"), [ 4 /*yield*/ , n() ];

                                      case 1:
                                        return t.sent(), this.Wa.delete(1 /* IndexedDbFailed */), [ 4 /*yield*/ , this.iu() ];

                                      case 2:
                                        return t.sent(), [ 2 /*return*/ ];
                                    }
                                }));
                            }));
                        })), [ 2 /*return*/ ];
                    }
                }));
            }));
        }, 
        /**
         * Executes `op`. If `op` fails, takes the network offline until `op`
         * succeeds. Returns after the first attempt.
         */
        e.prototype.Eu = function(t) {
            var e = this;
            return t().catch((function(n) {
                return e.wu(n, t);
            }));
        }, 
        /**
         * Takes a batch of changes from the Datastore, repackages them as a
         * RemoteEvent, and passes that on to the listener, which is typically the
         * SyncEngine.
         */
        e.prototype.Tu = function(t) {
            var e = this, n = this.Qa.ke(t);
            // Update in-memory resume tokens. LocalStore will update the
            // persistent view of these when applying the completed RemoteEvent.
            // Finally raise remote event
            return n.Wt.forEach((function(n, r) {
                if (n.resumeToken.Y() > 0) {
                    var i = e.Ua.get(r);
                    // A watched target might have been removed already.
                                    i && e.Ua.set(r, i.et(n.resumeToken, t));
                }
            })), 
            // Re-establish listens for the targets that have been invalidated by
            // existence filter mismatches.
            n.jt.forEach((function(t) {
                var n = e.Ua.get(t);
                if (n) {
                    // Clear the resume token for the target, since we're in a known mismatch
                    // state.
                    e.Ua.set(t, n.et(Q.J, n.Z)), 
                    // Cause a hard reset by unwatching and rewatching immediately, but
                    // deliberately don't send a resume token so that we get a full update.
                    e._u(t);
                    // Mark the target we send as being on behalf of an existence filter
                    // mismatch, but don't actually retain that in listenTargets. This ensures
                    // that we flag the first re-listen this way without impacting future
                    // listens of this target (that might happen e.g. on reconnect).
                    var r = new K(n.target, t, 1 /* ExistenceFilterMismatch */ , n.sequenceNumber);
                    e.cu(r);
                }
            })), this.fu.Iu(n);
        }, 
        /** Handles an error on a target */ e.prototype.du = function(e) {
            return t.__awaiter(this, void 0, void 0, (function() {
                var n, r, i, o;
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        n = e.cause, r = 0, i = e.targetIds, t.label = 1;

                      case 1:
                        return r < i.length ? (o = i[r], this.Ua.has(o) ? [ 4 /*yield*/ , this.fu.mu(o, n) ] : [ 3 /*break*/ , 3 ]) : [ 3 /*break*/ , 5 ];

                      case 2:
                        t.sent(), this.Ua.delete(o), this.Qa.removeTarget(o), t.label = 3;

                      case 3:
                        t.label = 4;

                      case 4:
                        return r++, [ 3 /*break*/ , 1 ];

                      case 5:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        }, 
        /**
         * Attempts to fill our write pipeline with writes from the LocalStore.
         *
         * Called internally to bootstrap or refill the write pipeline and by
         * SyncEngine whenever there are new mutations to process.
         *
         * Starts the write stream if necessary.
         */
        e.prototype.hu = function() {
            return t.__awaiter(this, void 0, void 0, (function() {
                var e, n, r;
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        e = this.Ba.length > 0 ? this.Ba[this.Ba.length - 1].batchId : -1, t.label = 1;

                      case 1:
                        if (!this.Au()) return [ 3 /*break*/ , 7 ];
                        t.label = 2;

                      case 2:
                        return t.trys.push([ 2, 4, , 6 ]), [ 4 /*yield*/ , Ti(this.La, e) ];

                      case 3:
                        return null === (n = t.sent()) ? (0 === this.Ba.length && this.tu.ra(), [ 3 /*break*/ , 7 ]) : (e = n.batchId, 
                        this.Ru(n), [ 3 /*break*/ , 6 ]);

                      case 4:
                        return r = t.sent(), [ 4 /*yield*/ , this.wu(r) ];

                      case 5:
                        return t.sent(), [ 3 /*break*/ , 6 ];

                      case 6:
                        return [ 3 /*break*/ , 1 ];

                      case 7:
                        return this.Pu() && this.gu(), [ 2 /*return*/ ];
                    }
                }));
            }));
        }, 
        /**
         * Returns true if we can add to the write pipeline (i.e. the network is
         * enabled and the write pipeline is not full).
         */
        e.prototype.Au = function() {
            return this.Ga() && this.Ba.length < 10;
        }, 
        // For testing
        e.prototype.Vu = function() {
            return this.Ba.length;
        }, 
        /**
         * Queues additional writes to be sent to the write stream, sending them
         * immediately if the write stream is established.
         */
        e.prototype.Ru = function(t) {
            this.Ba.push(t), this.tu.na() && this.tu.Ra && this.tu.Pa(t.mutations);
        }, e.prototype.Pu = function() {
            return this.Ga() && !this.tu.ea() && this.Ba.length > 0;
        }, e.prototype.gu = function() {
            this.tu.start();
        }, e.prototype.eu = function() {
            return t.__awaiter(this, void 0, void 0, (function() {
                return t.__generator(this, (function(t) {
                    return this.tu.ya(), [ 2 /*return*/ ];
                }));
            }));
        }, e.prototype.su = function() {
            return t.__awaiter(this, void 0, void 0, (function() {
                var e, n, r;
                return t.__generator(this, (function(t) {
                    // Send the write pipeline now that the stream is established.
                    for (e = 0, n = this.Ba; e < n.length; e++) r = n[e], this.tu.Pa(r.mutations);
                    return [ 2 /*return*/ ];
                }));
            }));
        }, e.prototype.ga = function(e, n) {
            return t.__awaiter(this, void 0, void 0, (function() {
                var r, i, o = this;
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        return r = this.Ba.shift(), i = Mn.from(r, e, n), [ 4 /*yield*/ , this.Eu((function() {
                            return o.fu.yu(i);
                        })) ];

                      case 1:
                        // It's possible that with the completion of this mutation another
                        // slot has freed up.
                        return t.sent(), [ 4 /*yield*/ , this.hu() ];

                      case 2:
                        // It's possible that with the completion of this mutation another
                        // slot has freed up.
                        return t.sent(), [ 2 /*return*/ ];
                    }
                }));
            }));
        }, e.prototype.nu = function(e) {
            return t.__awaiter(this, void 0, void 0, (function() {
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        return e && this.tu.Ra ? [ 4 /*yield*/ , this.pu(e) ] : [ 3 /*break*/ , 2 ];

                        // This error affects the actual write.
                                          case 1:
                        // This error affects the actual write.
                        t.sent(), t.label = 2;

                      case 2:
                        // If the write stream closed after the write handshake completes, a write
                        // operation failed and we fail the pending operation.
                        // The write stream might have been started by refilling the write
                        // pipeline for failed writes
                        return this.Pu() && this.gu(), [ 2 /*return*/ ];
                    }
                }));
            }));
        }, e.prototype.pu = function(e) {
            return t.__awaiter(this, void 0, void 0, (function() {
                var n, r, i = this;
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        return Z(r = e.code) && r !== D.ABORTED ? (n = this.Ba.shift(), 
                        // In this case it's also unlikely that the server itself is melting
                        // down -- this was just a bad request so inhibit backoff on the next
                        // restart.
                        this.tu.ia(), [ 4 /*yield*/ , this.Eu((function() {
                            return i.fu.bu(n.batchId, e);
                        })) ]) : [ 3 /*break*/ , 3 ];

                      case 1:
                        // It's possible that with the completion of this mutation
                        // another slot has freed up.
                        return t.sent(), [ 4 /*yield*/ , this.hu() ];

                      case 2:
                        // In this case it's also unlikely that the server itself is melting
                        // down -- this was just a bad request so inhibit backoff on the next
                        // restart.
                        // It's possible that with the completion of this mutation
                        // another slot has freed up.
                        t.sent(), t.label = 3;

                      case 3:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        }, e.prototype.za = function() {
            return t.__awaiter(this, void 0, void 0, (function() {
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        return this.Wa.add(4 /* ConnectivityChange */), [ 4 /*yield*/ , this.au() ];

                      case 1:
                        return t.sent(), this.Ha.set("Unknown" /* Unknown */), this.tu.ia(), this.Ya.ia(), 
                        this.Wa.delete(4 /* ConnectivityChange */), [ 4 /*yield*/ , this.iu() ];

                      case 2:
                        return t.sent(), [ 2 /*return*/ ];
                    }
                }));
            }));
        }, e.prototype.vu = function(e) {
            return t.__awaiter(this, void 0, void 0, (function() {
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        return this.ei.pi(), 
                        // Tear down and re-create our network streams. This will ensure we get a
                        // fresh auth token for the new user and re-fill the write pipeline with
                        // new mutations from the LocalStore (since mutations are per-user).
                        h("RemoteStore", "RemoteStore received new credentials"), this.Wa.add(3 /* CredentialChange */), 
                        [ 4 /*yield*/ , this.au() ];

                      case 1:
                        return t.sent(), this.Ha.set("Unknown" /* Unknown */), [ 4 /*yield*/ , this.fu.vu(e) ];

                      case 2:
                        return t.sent(), this.Wa.delete(3 /* CredentialChange */), [ 4 /*yield*/ , this.iu() ];

                      case 3:
                        return t.sent(), [ 2 /*return*/ ];
                    }
                }));
            }));
        }, 
        /**
         * Toggles the network state when the client gains or loses its primary lease.
         */
        e.prototype.Su = function(e) {
            return t.__awaiter(this, void 0, void 0, (function() {
                var n;
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        return e ? (this.Wa.delete(2 /* IsSecondary */), [ 4 /*yield*/ , this.iu() ]) : [ 3 /*break*/ , 2 ];

                      case 1:
                        return t.sent(), [ 3 /*break*/ , 5 ];

                      case 2:
                        return (n = e) ? [ 3 /*break*/ , 4 ] : (this.Wa.add(2 /* IsSecondary */), [ 4 /*yield*/ , this.au() ]);

                      case 3:
                        t.sent(), n = this.Ha.set("Unknown" /* Unknown */), t.label = 4;

                      case 4:
                        t.label = 5;

                      case 5:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        }, e;
    }();

    /** A CredentialsProvider that always yields an empty token. */
    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // The format of the LocalStorage key that stores the client state is:
    //     firestore_clients_<persistence_prefix>_<instance_key>
    /** Assembles the key for a client state in WebStorage */
    function zi(t, e) {
        return "firestore_clients_" + t + "_" + e;
    }

    // The format of the WebStorage key that stores the mutation state is:
    //     firestore_mutations_<persistence_prefix>_<batch_id>
    //     (for unauthenticated users)
    // or: firestore_mutations_<persistence_prefix>_<batch_id>_<user_uid>
    // 'user_uid' is last to avoid needing to escape '_' characters that it might
    // contain.
    /** Assembles the key for a mutation batch in WebStorage */ function Qi(t, e, n) {
        var r = "firestore_mutations_" + t + "_" + n;
        return e.Er() && (r += "_" + e.uid), r;
    }

    // The format of the WebStorage key that stores a query target's metadata is:
    //     firestore_targets_<persistence_prefix>_<target_id>
    /** Assembles the key for a query state in WebStorage */ function Wi(t, e) {
        return "firestore_targets_" + t + "_" + e;
    }

    // The WebStorage prefix that stores the primary tab's online state. The
    // format of the key is:
    //     firestore_online_state_<persistence_prefix>
    /**
     * Holds the state of a mutation batch, including its user ID, batch ID and
     * whether the batch is 'pending', 'acknowledged' or 'rejected'.
     */
    // Visible for testing
    var Hi = /** @class */ function() {
        function t(t, e, n, r) {
            this.user = t, this.batchId = e, this.state = n, this.error = r
            /**
         * Parses a MutationMetadata from its JSON representation in WebStorage.
         * Logs a warning and returns null if the format of the data is not valid.
         */;
        }
        return t.Du = function(e, n, r) {
            var i = JSON.parse(r), o = "object" == typeof i && -1 !== [ "pending", "acknowledged", "rejected" ].indexOf(i.state) && (void 0 === i.error || "object" == typeof i.error), s = void 0;
            return o && i.error && ((o = "string" == typeof i.error.message && "string" == typeof i.error.code) && (s = new x(i.error.code, i.error.message))), 
            o ? new t(e, n, i.state, s) : (f("SharedClientState", "Failed to parse mutation state for ID '" + n + "': " + r), 
            null);
        }, t.prototype.Cu = function() {
            var t = {
                state: this.state,
                updateTimeMs: Date.now()
            };
            return this.error && (t.error = {
                code: this.error.code,
                message: this.error.message
            }), JSON.stringify(t);
        }, t;
    }(), Ki = /** @class */ function() {
        function t(t, e, n) {
            this.targetId = t, this.state = e, this.error = n
            /**
         * Parses a QueryTargetMetadata from its JSON representation in WebStorage.
         * Logs a warning and returns null if the format of the data is not valid.
         */;
        }
        return t.Du = function(e, n) {
            var r = JSON.parse(n), i = "object" == typeof r && -1 !== [ "not-current", "current", "rejected" ].indexOf(r.state) && (void 0 === r.error || "object" == typeof r.error), o = void 0;
            return i && r.error && ((i = "string" == typeof r.error.message && "string" == typeof r.error.code) && (o = new x(r.error.code, r.error.message))), 
            i ? new t(e, r.state, o) : (f("SharedClientState", "Failed to parse target state for ID '" + e + "': " + n), 
            null);
        }, t.prototype.Cu = function() {
            var t = {
                state: this.state,
                updateTimeMs: Date.now()
            };
            return this.error && (t.error = {
                code: this.error.code,
                message: this.error.message
            }), JSON.stringify(t);
        }, t;
    }(), Yi = /** @class */ function() {
        function t(t, e) {
            this.clientId = t, this.activeTargetIds = e
            /**
         * Parses a RemoteClientState from the JSON representation in WebStorage.
         * Logs a warning and returns null if the format of the data is not valid.
         */;
        }
        return t.Du = function(e, n) {
            for (var r = JSON.parse(n), i = "object" == typeof r && r.activeTargetIds instanceof Array, o = lt(), s = 0; i && s < r.activeTargetIds.length; ++s) i = M(r.activeTargetIds[s]), 
            o = o.add(r.activeTargetIds[s]);
            return i ? new t(e, o) : (f("SharedClientState", "Failed to parse client data for instance '" + e + "': " + n), 
            null);
        }, t;
    }(), Zi = /** @class */ function() {
        function t(t, e) {
            this.clientId = t, this.onlineState = e
            /**
         * Parses a SharedOnlineState from its JSON representation in WebStorage.
         * Logs a warning and returns null if the format of the data is not valid.
         */;
        }
        return t.Du = function(e) {
            var n = JSON.parse(e);
            return "object" == typeof n && -1 !== [ "Unknown", "Online", "Offline" ].indexOf(n.onlineState) && "string" == typeof n.clientId ? new t(n.clientId, n.onlineState) : (f("SharedClientState", "Failed to parse online state: " + e), 
            null);
        }, t;
    }(), Xi = /** @class */ function() {
        function t() {
            this.activeTargetIds = lt();
        }
        return t.prototype.Nu = function(t) {
            this.activeTargetIds = this.activeTargetIds.add(t);
        }, t.prototype.Fu = function(t) {
            this.activeTargetIds = this.activeTargetIds.delete(t);
        }, 
        /**
         * Converts this entry into a JSON-encoded format we can use for WebStorage.
         * Does not encode `clientId` as it is part of the key in WebStorage.
         */
        t.prototype.Cu = function() {
            var t = {
                activeTargetIds: this.activeTargetIds.N(),
                updateTimeMs: Date.now()
            };
            return JSON.stringify(t);
        }, t;
    }(), $i = /** @class */ function() {
        function e(t, e, n, r, i) {
            this.window = t, this.Is = e, this.persistenceKey = n, this.ku = r, this.fu = null, 
            this.Da = null, this.fs = null, this.$u = this.xu.bind(this), this.Ou = new $(w), 
            this.tr = !1, 
            /**
                 * Captures WebStorage events that occur before `start()` is called. These
                 * events are replayed once `WebStorageSharedClientState` is started.
                 */
            this.Mu = [];
            // Escape the special characters mentioned here:
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
            var o = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            this.storage = this.window.localStorage, this.currentUser = i, this.Lu = zi(this.persistenceKey, this.ku), 
            this.qu = 
            /** Assembles the key for the current sequence number. */
            function(t) {
                return "firestore_sequence_number_" + t;
            }(this.persistenceKey), this.Ou = this.Ou.st(this.ku, new Xi), this.Bu = new RegExp("^firestore_clients_" + o + "_([^_]*)$"), 
            this.Uu = new RegExp("^firestore_mutations_" + o + "_(\\d+)(?:_(.*))?$"), this.Qu = new RegExp("^firestore_targets_" + o + "_(\\d+)$"), 
            this.Wu = 
            /** Assembles the key for the online state of the primary tab. */
            function(t) {
                return "firestore_online_state_" + t;
            }(this.persistenceKey), 
            // Rather than adding the storage observer during start(), we add the
            // storage observer during initialization. This ensures that we collect
            // events before other components populate their initial state (during their
            // respective start() calls). Otherwise, we might for example miss a
            // mutation that is added after LocalStore's start() processed the existing
            // mutations but before we observe WebStorage events.
            this.window.addEventListener("storage", this.$u);
        }
        /** Returns 'true' if WebStorage is available in the current environment. */    return e.ks = function(t) {
            return !(!t || !t.localStorage);
        }, e.prototype.start = function() {
            return t.__awaiter(this, void 0, void 0, (function() {
                var e, n, r, i, o, s, u, a, c, h, f, l = this;
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        return [ 4 /*yield*/ , this.fu.rh() ];

                      case 1:
                        for (e = t.sent(), n = 0, r = e; n < r.length; n++) (i = r[n]) !== this.ku && (o = this.getItem(zi(this.persistenceKey, i))) && (s = Yi.Du(i, o)) && (this.Ou = this.Ou.st(s.clientId, s));
                        for (this.ju(), (u = this.storage.getItem(this.Wu)) && (a = this.Ku(u)) && this.Gu(a), 
                        c = 0, h = this.Mu; c < h.length; c++) f = h[c], this.xu(f);
                        return this.Mu = [], 
                        // Register a window unload hook to remove the client metadata entry from
                        // WebStorage even if `shutdown()` was not called.
                        this.window.addEventListener("unload", (function() {
                            return l.th();
                        })), this.tr = !0, [ 2 /*return*/ ];
                    }
                }));
            }));
        }, e.prototype.Ts = function(t) {
            this.setItem(this.qu, JSON.stringify(t));
        }, e.prototype.zu = function() {
            return this.Hu(this.Ou);
        }, e.prototype.Yu = function(t) {
            var e = !1;
            return this.Ou.forEach((function(n, r) {
                r.activeTargetIds.has(t) && (e = !0);
            })), e;
        }, e.prototype.Ju = function(t) {
            this.Xu(t, "pending");
        }, e.prototype.Zu = function(t, e, n) {
            this.Xu(t, e, n), 
            // Once a final mutation result is observed by other clients, they no longer
            // access the mutation's metadata entry. Since WebStorage replays events
            // in order, it is safe to delete the entry right after updating it.
            this.tc(t);
        }, e.prototype.ec = function(t) {
            var e = "not-current";
            // Lookup an existing query state if the target ID was already registered
            // by another tab
                    if (this.Yu(t)) {
                var n = this.storage.getItem(Wi(this.persistenceKey, t));
                if (n) {
                    var r = Ki.Du(t, n);
                    r && (e = r.state);
                }
            }
            return this.nc.Nu(t), this.ju(), e;
        }, e.prototype.sc = function(t) {
            this.nc.Fu(t), this.ju();
        }, e.prototype.ic = function(t) {
            return this.nc.activeTargetIds.has(t);
        }, e.prototype.rc = function(t) {
            this.removeItem(Wi(this.persistenceKey, t));
        }, e.prototype.oc = function(t, e, n) {
            this.hc(t, e, n);
        }, e.prototype.ac = function(t, e, n) {
            var r = this;
            e.forEach((function(t) {
                r.tc(t);
            })), this.currentUser = t, n.forEach((function(t) {
                r.Ju(t);
            }));
        }, e.prototype.uc = function(t) {
            this.cc(t);
        }, e.prototype.th = function() {
            this.tr && (this.window.removeEventListener("storage", this.$u), this.removeItem(this.Lu), 
            this.tr = !1);
        }, e.prototype.getItem = function(t) {
            var e = this.storage.getItem(t);
            return h("SharedClientState", "READ", t, e), e;
        }, e.prototype.setItem = function(t, e) {
            h("SharedClientState", "SET", t, e), this.storage.setItem(t, e);
        }, e.prototype.removeItem = function(t) {
            h("SharedClientState", "REMOVE", t), this.storage.removeItem(t);
        }, e.prototype.xu = function(e) {
            var n = this, r = e;
            // Note: The function is typed to take Event to be interface-compatible with
            // `Window.addEventListener`.
                    if (r.storageArea === this.storage) {
                if (h("SharedClientState", "EVENT", r.key, r.newValue), r.key === this.Lu) return void f("Received WebStorage notification for local change. Another client might have garbage-collected our state");
                this.Is.gi((function() {
                    return t.__awaiter(n, void 0, void 0, (function() {
                        var e, n, i, o, s, u;
                        return t.__generator(this, (function(t) {
                            if (this.tr) {
                                if (null !== r.key) if (this.Bu.test(r.key)) {
                                    if (null == r.newValue) return e = this.lc(r.key), [ 2 /*return*/ , this._c(e, null) ];
                                    if (n = this.fc(r.key, r.newValue)) return [ 2 /*return*/ , this._c(n.clientId, n) ];
                                } else if (this.Uu.test(r.key)) {
                                    if (null !== r.newValue && (i = this.dc(r.key, r.newValue))) return [ 2 /*return*/ , this.wc(i) ];
                                } else if (this.Qu.test(r.key)) {
                                    if (null !== r.newValue && (o = this.Tc(r.key, r.newValue))) return [ 2 /*return*/ , this.Ec(o) ];
                                } else if (r.key === this.Wu) {
                                    if (null !== r.newValue && (s = this.Ku(r.newValue))) return [ 2 /*return*/ , this.Gu(s) ];
                                } else r.key === this.qu && (u = function(t) {
                                    var e = Wn.Es;
                                    if (null != t) try {
                                        var n = JSON.parse(t);
                                        y("number" == typeof n), e = n;
                                    } catch (t) {
                                        f("SharedClientState", "Failed to read sequence number from WebStorage", t);
                                    }
                                    return e;
                                }(r.newValue)) !== Wn.Es && this.fs(u);
                            } else this.Mu.push(r);
                            return [ 2 /*return*/ ];
                        }));
                    }));
                }));
            }
        }, Object.defineProperty(e.prototype, "nc", {
            get: function() {
                return this.Ou.get(this.ku);
            },
            enumerable: !1,
            configurable: !0
        }), e.prototype.ju = function() {
            this.setItem(this.Lu, this.nc.Cu());
        }, e.prototype.Xu = function(t, e, n) {
            var r = new Hi(this.currentUser, t, e, n), i = Qi(this.persistenceKey, this.currentUser, t);
            this.setItem(i, r.Cu());
        }, e.prototype.tc = function(t) {
            var e = Qi(this.persistenceKey, this.currentUser, t);
            this.removeItem(e);
        }, e.prototype.cc = function(t) {
            var e = {
                clientId: this.ku,
                onlineState: t
            };
            this.storage.setItem(this.Wu, JSON.stringify(e));
        }, e.prototype.hc = function(t, e, n) {
            var r = Wi(this.persistenceKey, t), i = new Ki(t, e, n);
            this.setItem(r, i.Cu());
        }, 
        /**
         * Parses a client state key in WebStorage. Returns null if the key does not
         * match the expected key format.
         */
        e.prototype.lc = function(t) {
            var e = this.Bu.exec(t);
            return e ? e[1] : null;
        }, 
        /**
         * Parses a client state in WebStorage. Returns 'null' if the value could not
         * be parsed.
         */
        e.prototype.fc = function(t, e) {
            var n = this.lc(t);
            return Yi.Du(n, e);
        }, 
        /**
         * Parses a mutation batch state in WebStorage. Returns 'null' if the value
         * could not be parsed.
         */
        e.prototype.dc = function(t, e) {
            var n = this.Uu.exec(t), r = Number(n[1]), i = void 0 !== n[2] ? n[2] : null;
            return Hi.Du(new Ri(i), r, e);
        }, 
        /**
         * Parses a query target state from WebStorage. Returns 'null' if the value
         * could not be parsed.
         */
        e.prototype.Tc = function(t, e) {
            var n = this.Qu.exec(t), r = Number(n[1]);
            return Ki.Du(r, e);
        }, 
        /**
         * Parses an online state from WebStorage. Returns 'null' if the value
         * could not be parsed.
         */
        e.prototype.Ku = function(t) {
            return Zi.Du(t);
        }, e.prototype.wc = function(e) {
            return t.__awaiter(this, void 0, void 0, (function() {
                return t.__generator(this, (function(t) {
                    return e.user.uid === this.currentUser.uid ? [ 2 /*return*/ , this.fu.Ic(e.batchId, e.state, e.error) ] : (h("SharedClientState", "Ignoring mutation for non-active user " + e.user.uid), 
                    [ 2 /*return*/ ]);
                }));
            }));
        }, e.prototype.Ec = function(t) {
            return this.fu.mc(t.targetId, t.state, t.error);
        }, e.prototype._c = function(t, e) {
            var n = this, r = e ? this.Ou.st(t, e) : this.Ou.remove(t), i = this.Hu(this.Ou), o = this.Hu(r), s = [], u = [];
            return o.forEach((function(t) {
                i.has(t) || s.push(t);
            })), i.forEach((function(t) {
                o.has(t) || u.push(t);
            })), this.fu.Ac(s, u).then((function() {
                n.Ou = r;
            }));
        }, e.prototype.Gu = function(t) {
            // We check whether the client that wrote this online state is still active
            // by comparing its client ID to the list of clients kept active in
            // IndexedDb. If a client does not update their IndexedDb client state
            // within 5 seconds, it is considered inactive and we don't emit an online
            // state event.
            this.Ou.get(t.clientId) && this.Da(t.onlineState);
        }, e.prototype.Hu = function(t) {
            var e = lt();
            return t.forEach((function(t, n) {
                e = e.Nt(n.activeTargetIds);
            })), e;
        }, e;
    }(), Ji = /** @class */ function() {
        function t() {
            this.Rc = new Xi, this.Pc = {}, this.Da = null, this.fs = null;
        }
        return t.prototype.Ju = function(t) {
            // No op.
        }, t.prototype.Zu = function(t, e, n) {
            // No op.
        }, t.prototype.ec = function(t) {
            return this.Rc.Nu(t), this.Pc[t] || "not-current";
        }, t.prototype.oc = function(t, e, n) {
            this.Pc[t] = e;
        }, t.prototype.sc = function(t) {
            this.Rc.Fu(t);
        }, t.prototype.ic = function(t) {
            return this.Rc.activeTargetIds.has(t);
        }, t.prototype.rc = function(t) {
            delete this.Pc[t];
        }, t.prototype.zu = function() {
            return this.Rc.activeTargetIds;
        }, t.prototype.Yu = function(t) {
            return this.Rc.activeTargetIds.has(t);
        }, t.prototype.start = function() {
            return this.Rc = new Xi, Promise.resolve();
        }, t.prototype.ac = function(t, e, n) {
            // No op.
        }, t.prototype.uc = function(t) {
            // No op.
        }, t.prototype.th = function() {}, t.prototype.Ts = function(t) {}, t;
    }(), to = function(t) {
        this.key = t;
    }, eo = function(t) {
        this.key = t;
    }, no = /** @class */ function() {
        function t(t, 
        /** Documents included in the remote target */
        e) {
            this.query = t, this.gc = e, this.Vc = null, 
            /**
                 * A flag whether the view is current with the backend. A view is considered
                 * current after it has seen the current flag from the backend and did not
                 * lose consistency within the watch stream (e.g. because of an existence
                 * filter mismatch).
                 */
            this.Yt = !1, 
            /** Documents in the view but not in the remote target */
            this.yc = ht(), 
            /** Document Keys that have local changes */
            this.qt = ht(), this.pc = _n(t), this.bc = new pt(this.pc);
        }
        return Object.defineProperty(t.prototype, "vc", {
            /**
             * The set of remote documents that the server has told us belongs to the target associated with
             * this view.
             */
            get: function() {
                return this.gc;
            },
            enumerable: !1,
            configurable: !0
        }), 
        /**
         * Iterates over a set of doc changes, applies the query limit, and computes
         * what the new results should be, what the changes were, and whether we may
         * need to go back to the local cache for more results. Does not make any
         * changes to the view.
         * @param docChanges The doc changes to apply to this view.
         * @param previousChanges If this is being called with a refill, then start
         *        with this set of docs and changes instead of the current view.
         * @return a new set of docs, changes, and refill flag.
         */
        t.prototype.Sc = function(t, e) {
            var n = this, r = e ? e.Dc : new dt, i = e ? e.bc : this.bc, o = e ? e.qt : this.qt, s = i, u = !1, a = this.query.an() && i.size === this.query.limit ? i.last() : null, c = this.query.un() && i.size === this.query.limit ? i.first() : null;
            // Drop documents out to meet limit/limitToLast requirement.
            if (t.ht((function(t, e) {
                var h = i.get(t), f = e instanceof rn ? e : null;
                f && (f = bn(n.query, f) ? f : null);
                var l = !!h && n.qt.has(h.key), p = !!f && (f.Ge || 
                // We only consider committed mutations for documents that were
                // mutated during the lifetime of the view.
                n.qt.has(f.key) && f.hasCommittedMutations), d = !1;
                // Calculate change
                h && f ? h.data().isEqual(f.data()) ? l !== p && (r.track({
                    type: 3 /* Metadata */ ,
                    doc: f
                }), d = !0) : n.Cc(h, f) || (r.track({
                    type: 2 /* Modified */ ,
                    doc: f
                }), d = !0, (a && n.pc(f, a) > 0 || c && n.pc(f, c) < 0) && (
                // This doc moved from inside the limit to outside the limit.
                // That means there may be some other doc in the local cache
                // that should be included instead.
                u = !0)) : !h && f ? (r.track({
                    type: 0 /* Added */ ,
                    doc: f
                }), d = !0) : h && !f && (r.track({
                    type: 1 /* Removed */ ,
                    doc: h
                }), d = !0, (a || c) && (
                // A doc was removed from a full limit query. We'll need to
                // requery from the local cache to see if we know about some other
                // doc that should be in the results.
                u = !0)), d && (f ? (s = s.add(f), o = p ? o.add(t) : o.delete(t)) : (s = s.delete(t), 
                o = o.delete(t)));
            })), this.query.an() || this.query.un()) for (;s.size > this.query.limit; ) {
                var h = this.query.an() ? s.last() : s.first();
                s = s.delete(h.key), o = o.delete(h.key), r.track({
                    type: 1 /* Removed */ ,
                    doc: h
                });
            }
            return {
                bc: s,
                Dc: r,
                Nc: u,
                qt: o
            };
        }, t.prototype.Cc = function(t, e) {
            // We suppress the initial change event for documents that were modified as
            // part of a write acknowledgment (e.g. when the value of a server transform
            // is applied) as Watch will send us the same document again.
            // By suppressing the event, we only raise two user visible events (one with
            // `hasPendingWrites` and the final state of the document) instead of three
            // (one with `hasPendingWrites`, the modified document with
            // `hasPendingWrites` and the final state of the document).
            return t.Ge && e.hasCommittedMutations && !e.Ge;
        }, 
        /**
         * Updates the view with the given ViewDocumentChanges and optionally updates
         * limbo docs and sync state from the provided target change.
         * @param docChanges The set of changes to make to the view's docs.
         * @param updateLimboDocuments Whether to update limbo documents based on this
         *        change.
         * @param targetChange A target change to apply for computing limbo docs and
         *        sync state.
         * @return A new ViewChange with the given docs, changes, and sync state.
         */
        // PORTING NOTE: The iOS/Android clients always compute limbo document changes.
        t.prototype.Un = function(t, e, n) {
            var r = this, i = this.bc;
            this.bc = t.bc, this.qt = t.qt;
            // Sort changes based on type and query comparator
            var o = t.Dc.Mt();
            o.sort((function(t, e) {
                return function(t, e) {
                    var n = function(t) {
                        switch (t) {
                          case 0 /* Added */ :
                            return 1;

                          case 2 /* Modified */ :
                          case 3 /* Metadata */ :
                            // A metadata change is converted to a modified change at the public
                            // api layer.  Since we sort by document key and then change type,
                            // metadata and modified changes must be sorted equivalently.
                            return 2;

                          case 1 /* Removed */ :
                            return 0;

                          default:
                            return d();
                        }
                    };
                    return n(t) - n(e);
                }(t.type, e.type) || r.pc(t.doc, e.doc);
            })), this.Fc(n);
            var s = e ? this.kc() : [], u = 0 === this.yc.size && this.Yt ? 1 /* Synced */ : 0 /* Local */ , a = u !== this.Vc;
            return this.Vc = u, 0 !== o.length || a ? {
                snapshot: new yt(this.query, t.bc, i, o, t.qt, 0 /* Local */ === u, a, 
                /* excludesMetadataChanges= */ !1),
                $c: s
            } : {
                $c: s
            };
            // no changes
            }, 
        /**
         * Applies an OnlineState change to the view, potentially generating a
         * ViewChange if the view's syncState changes as a result.
         */
        t.prototype.xc = function(t) {
            return this.Yt && "Offline" /* Offline */ === t ? (
            // If we're offline, set `current` to false and then call applyChanges()
            // to refresh our syncState and generate a ViewChange as appropriate. We
            // are guaranteed to get a new TargetChange that sets `current` back to
            // true once the client is back online.
            this.Yt = !1, this.Un({
                bc: this.bc,
                Dc: new dt,
                qt: this.qt,
                Nc: !1
            }, 
            /* updateLimboDocuments= */ !1)) : {
                $c: []
            };
        }, 
        /**
         * Returns whether the doc for the given key should be in limbo.
         */
        t.prototype.Oc = function(t) {
            // If the remote end says it's part of this query, it's not in limbo.
            return !this.gc.has(t) && 
            // The local store doesn't think it's a result, so it shouldn't be in limbo.
            !!this.bc.has(t) && !this.bc.get(t).Ge;
        }, 
        /**
         * Updates syncedDocuments, current, and limbo docs based on the given change.
         * Returns the list of changes to which docs are in limbo.
         */
        t.prototype.Fc = function(t) {
            var e = this;
            t && (t.Jt.forEach((function(t) {
                return e.gc = e.gc.add(t);
            })), t.Xt.forEach((function(t) {})), t.Zt.forEach((function(t) {
                return e.gc = e.gc.delete(t);
            })), this.Yt = t.Yt);
        }, t.prototype.kc = function() {
            var t = this;
            // We can only determine limbo documents when we're in-sync with the server.
                    if (!this.Yt) return [];
            // TODO(klimt): Do this incrementally so that it's not quadratic when
            // updating many documents.
                    var e = this.yc;
            this.yc = ht(), this.bc.forEach((function(e) {
                t.Oc(e.key) && (t.yc = t.yc.add(e.key));
            }));
            // Diff the new limbo docs with the old limbo docs.
            var n = [];
            return e.forEach((function(e) {
                t.yc.has(e) || n.push(new eo(e));
            })), this.yc.forEach((function(t) {
                e.has(t) || n.push(new to(t));
            })), n;
        }, 
        /**
         * Update the in-memory state of the current view with the state read from
         * persistence.
         *
         * We update the query view whenever a client's primary status changes:
         * - When a client transitions from primary to secondary, it can miss
         *   LocalStorage updates and its query views may temporarily not be
         *   synchronized with the state on disk.
         * - For secondary to primary transitions, the client needs to update the list
         *   of `syncedDocuments` since secondary clients update their query views
         *   based purely on synthesized RemoteEvents.
         *
         * @param queryResult.documents - The documents that match the query according
         * to the LocalStore.
         * @param queryResult.remoteKeys - The keys of the documents that match the
         * query according to the backend.
         *
         * @return The ViewChange that resulted from this synchronization.
         */
        // PORTING NOTE: Multi-tab only.
        t.prototype.Mc = function(t) {
            this.gc = t.gh, this.yc = ht();
            var e = this.Sc(t.documents);
            return this.Un(e, /*updateLimboDocuments=*/ !0);
        }, 
        /**
         * Returns a view snapshot as if this query was just listened to. Contains
         * a document add for every existing document and the `fromCache` and
         * `hasPendingWrites` status of the already established view.
         */
        // PORTING NOTE: Multi-tab only.
        t.prototype.Lc = function() {
            return yt.Qt(this.query, this.bc, this.qt, 0 /* Local */ === this.Vc);
        }, t;
    }(), ro = function(
    /**
         * The query itself.
         */
    t, 
    /**
         * The target number created by the client that is used in the watch
         * stream to identify this query.
         */
    e, 
    /**
         * The view is responsible for computing the final merged truth of what
         * docs are in the query. It gets notified of local and remote changes,
         * and applies the query filters and limits to determine the most correct
         * possible results.
         */
    n) {
        this.query = t, this.targetId = e, this.view = n;
    }, io = function(t) {
        this.key = t, 
        /**
                 * Set to true once we've received a document. This is used in
                 * getRemoteKeysForTarget() and ultimately used by WatchChangeAggregator to
                 * decide whether it needs to manufacture a delete event for the target once
                 * the target is CURRENT.
                 */
        this.qc = !1;
    }, oo = /** @class */ function() {
        function e(t, e, n, 
        // PORTING NOTE: Manages state synchronization in multi-tab environments.
        r, i, o) {
            this.La = t, this.Bc = e, this.qa = n, this.Uc = r, this.currentUser = i, this.Qc = o, 
            this.Wc = null, this.jc = new S((function(t) {
                return mn(t);
            }), gn), this.Kc = new Map, 
            /**
                 * The keys of documents that are in limbo for which we haven't yet started a
                 * limbo resolution query.
                 */
            this.Gc = [], 
            /**
                 * Keeps track of the target ID for each document that is in limbo with an
                 * active target.
                 */
            this.zc = new $(U.P), 
            /**
                 * Keeps track of the information about an active limbo resolution for each
                 * active target ID that was started for the purpose of limbo resolution.
                 */
            this.Hc = new Map, this.Yc = new ki, 
            /** Stores user completion handlers, indexed by User and BatchId. */
            this.Jc = {}, 
            /** Stores user callbacks waiting for all pending writes to be acknowledged. */
            this.Xc = new Map, this.Zc = ui.eo(), this.onlineState = "Unknown" /* Unknown */ , 
            // The primary state is set to `true` or `false` immediately after Firestore
            // startup. In the interim, a client should only be considered primary if
            // `isPrimary` is true.
            this.tl = void 0;
        }
        return Object.defineProperty(e.prototype, "el", {
            get: function() {
                return !0 === this.tl;
            },
            enumerable: !1,
            configurable: !0
        }), e.prototype.subscribe = function(t) {
            this.Wc = t;
        }, e.prototype.listen = function(e) {
            return t.__awaiter(this, void 0, void 0, (function() {
                var n, r, i, o, s;
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        return this.nl("listen()"), (i = this.jc.get(e)) ? (
                        // PORTING NOTE: With Multi-Tab Web, it is possible that a query view
                        // already exists when EventManager calls us for the first time. This
                        // happens when the primary tab is already listening to this query on
                        // behalf of another tab and the user of the primary also starts listening
                        // to the query. EventManager will not have an assigned target ID in this
                        // case and calls `listen` to obtain this ID.
                        n = i.targetId, this.Uc.ec(n), r = i.view.Lc(), [ 3 /*break*/ , 4 ]) : [ 3 /*break*/ , 1 ];

                      case 1:
                        return [ 4 /*yield*/ , Ni(this.La, pn(e)) ];

                      case 2:
                        return o = t.sent(), s = this.Uc.ec(o.targetId), n = o.targetId, [ 4 /*yield*/ , this.sl(e, n, "current" === s) ];

                      case 3:
                        r = t.sent(), this.el && this.Bc.listen(o), t.label = 4;

                      case 4:
                        return [ 2 /*return*/ , r ];
                    }
                }));
            }));
        }, 
        /**
         * Registers a view for a previously unknown query and computes its initial
         * snapshot.
         */
        e.prototype.sl = function(e, n, r) {
            return t.__awaiter(this, void 0, void 0, (function() {
                var i, o, s, u, a, c;
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        return [ 4 /*yield*/ , Si(this.La, e, 
                        /* usePreviousResults= */ !0) ];

                      case 1:
                        return i = t.sent(), o = new no(e, i.gh), s = o.Sc(i.documents), u = gt.Ht(n, r && "Offline" /* Offline */ !== this.onlineState), 
                        a = o.Un(s, 
                        /* updateLimboDocuments= */ this.el, u), this.il(n, a.$c), c = new ro(e, n, o), 
                        [ 2 /*return*/ , (this.jc.set(e, c), this.Kc.has(n) ? this.Kc.get(n).push(e) : this.Kc.set(n, [ e ]), 
                        a.snapshot) ];
                    }
                }));
            }));
        }, e.prototype.lu = function(e) {
            return t.__awaiter(this, void 0, void 0, (function() {
                var n, r, i = this;
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        // Only clean up the query view and target if this is the only query mapped
                        // to the target.
                        return this.nl("unlisten()"), n = this.jc.get(e), (r = this.Kc.get(n.targetId)).length > 1 ? [ 2 /*return*/ , (this.Kc.set(n.targetId, r.filter((function(t) {
                            return !gn(t, e);
                        }))), void this.jc.delete(e)) ] : this.el ? (
                        // We need to remove the local query target first to allow us to verify
                        // whether any other client is still interested in this target.
                        this.Uc.sc(n.targetId), this.Uc.Yu(n.targetId) ? [ 3 /*break*/ , 2 ] : [ 4 /*yield*/ , Ai(this.La, n.targetId, 
                        /*keepPersistedTargetData=*/ !1).then((function() {
                            i.Uc.rc(n.targetId), i.Bc.lu(n.targetId), i.rl(n.targetId);
                        })).catch(xi) ]) : [ 3 /*break*/ , 3 ];

                      case 1:
                        t.sent(), t.label = 2;

                      case 2:
                        return [ 3 /*break*/ , 5 ];

                      case 3:
                        return this.rl(n.targetId), [ 4 /*yield*/ , Ai(this.La, n.targetId, 
                        /*keepPersistedTargetData=*/ !0) ];

                      case 4:
                        t.sent(), t.label = 5;

                      case 5:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        }, e.prototype.write = function(e, n) {
            return t.__awaiter(this, void 0, void 0, (function() {
                var r, i, o;
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        this.nl("write()"), t.label = 1;

                      case 1:
                        return t.trys.push([ 1, 5, , 6 ]), [ 4 /*yield*/ , 
                        /* Accepts locally generated Mutations and commit them to storage. */
                        function(t, e) {
                            var n, r = v(t), i = k.now(), o = e.reduce((function(t, e) {
                                return t.add(e.key);
                            }), ht());
                            return r.persistence.runTransaction("Locally write mutations", "readwrite", (function(t) {
                                return r.Rh.Zn(t, o).next((function(o) {
                                    n = o;
                                    for (
                                    // For non-idempotent mutations (such as `FieldValue.increment()`),
                                    // we record the base state in a separate patch mutation. This is
                                    // later used to guarantee consistent values and prevents flicker
                                    // even if the backend sends us an update that already includes our
                                    // transform.
                                    var s = [], u = 0, a = e; u < a.length; u++) {
                                        var c = a[u], h = je(c, n.get(c.key));
                                        null != h && 
                                        // NOTE: The base state should only be applied if there's some
                                        // existing document to override, so use a Precondition of
                                        // exists=true
                                        s.push(new We(c.key, h, en(h.proto.mapValue), Ce.exists(!0)));
                                    }
                                    return r.Gn.mr(t, i, s, e);
                                }));
                            })).then((function(t) {
                                var e = t.An(n);
                                return {
                                    batchId: t.batchId,
                                    Fn: e
                                };
                            }));
                        }(this.La, e) ];

                      case 2:
                        return r = t.sent(), this.Uc.Ju(r.batchId), this.ol(r.batchId, n), [ 4 /*yield*/ , this.hl(r.Fn) ];

                      case 3:
                        return t.sent(), [ 4 /*yield*/ , this.Bc.hu() ];

                      case 4:
                        return t.sent(), [ 3 /*break*/ , 6 ];

                      case 5:
                        return i = t.sent(), o = ar(i, "Failed to persist write"), n.reject(o), [ 3 /*break*/ , 6 ];

                      case 6:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        }, e.prototype.Iu = function(e) {
            return t.__awaiter(this, void 0, void 0, (function() {
                var n, r = this;
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        this.nl("applyRemoteEvent()"), t.label = 1;

                      case 1:
                        return t.trys.push([ 1, 4, , 6 ]), [ 4 /*yield*/ , Ei(this.La, e) ];

                      case 2:
                        return n = t.sent(), 
                        // Update `receivedDocument` as appropriate for any limbo targets.
                        e.Wt.forEach((function(t, e) {
                            var n = r.Hc.get(e);
                            n && (
                            // Since this is a limbo resolution lookup, it's for a single document
                            // and it could be added, modified, or removed, but not a combination.
                            y(t.Jt.size + t.Xt.size + t.Zt.size <= 1), t.Jt.size > 0 ? n.qc = !0 : t.Xt.size > 0 ? y(n.qc) : t.Zt.size > 0 && (y(n.qc), 
                            n.qc = !1));
                        })), [ 4 /*yield*/ , this.hl(n, e) ];

                      case 3:
                        // Update `receivedDocument` as appropriate for any limbo targets.
                        return t.sent(), [ 3 /*break*/ , 6 ];

                      case 4:
                        return [ 4 /*yield*/ , xi(t.sent()) ];

                      case 5:
                        return t.sent(), [ 3 /*break*/ , 6 ];

                      case 6:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        }, e.prototype.xc = function(t, e) {
            // If we are the secondary client, we explicitly ignore the remote store's
            // online state (the local client may go offline, even though the primary
            // tab remains online) and only apply the primary tab's online state from
            // SharedClientState.
            if (this.el && 0 /* RemoteStore */ === e || !this.el && 1 /* SharedClientState */ === e) {
                this.nl("applyOnlineStateChange()");
                var n = [];
                this.jc.forEach((function(e, r) {
                    var i = r.view.xc(t);
                    i.snapshot && n.push(i.snapshot);
                })), this.Wc.al(t), this.Wc.Ea(n), this.onlineState = t, this.el && this.Uc.uc(t);
            }
        }, e.prototype.mu = function(e, n) {
            return t.__awaiter(this, void 0, void 0, (function() {
                var r, i, o, s, u, a = this;
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        return this.nl("rejectListens()"), 
                        // PORTING NOTE: Multi-tab only.
                        this.Uc.oc(e, "rejected", n), r = this.Hc.get(e), (i = r && r.key) ? (o = (o = new $(U.P)).st(i, new on(i, L.min())), 
                        s = ht().add(i), u = new vt(L.min(), 
                        /* targetChanges= */ new Map, 
                        /* targetMismatches= */ new et(w), o, s), [ 4 /*yield*/ , this.Iu(u) ]) : [ 3 /*break*/ , 2 ];

                      case 1:
                        return t.sent(), 
                        // Since this query failed, we won't want to manually unlisten to it.
                        // We only remove it from bookkeeping after we successfully applied the
                        // RemoteEvent. If `applyRemoteEvent()` throws, we want to re-listen to
                        // this query when the RemoteStore restarts the Watch stream, which should
                        // re-trigger the target failure.
                        this.zc = this.zc.remove(i), this.Hc.delete(e), this.ul(), [ 3 /*break*/ , 4 ];

                      case 2:
                        return [ 4 /*yield*/ , Ai(this.La, e, 
                        /* keepPersistedTargetData */ !1).then((function() {
                            return a.rl(e, n);
                        })).catch(xi) ];

                      case 3:
                        t.sent(), t.label = 4;

                      case 4:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        }, e.prototype.yu = function(e) {
            return t.__awaiter(this, void 0, void 0, (function() {
                var n, r;
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        this.nl("applySuccessfulWrite()"), n = e.batch.batchId, t.label = 1;

                      case 1:
                        return t.trys.push([ 1, 4, , 6 ]), [ 4 /*yield*/ , _i(this.La, e) ];

                      case 2:
                        return r = t.sent(), 
                        // The local store may or may not be able to apply the write result and
                        // raise events immediately (depending on whether the watcher is caught
                        // up), so we raise user callbacks first so that they consistently happen
                        // before listen events.
                        this.cl(n, /*error=*/ null), this.ll(n), this.Uc.Zu(n, "acknowledged"), [ 4 /*yield*/ , this.hl(r) ];

                      case 3:
                        // The local store may or may not be able to apply the write result and
                        // raise events immediately (depending on whether the watcher is caught
                        // up), so we raise user callbacks first so that they consistently happen
                        // before listen events.
                        return t.sent(), [ 3 /*break*/ , 6 ];

                      case 4:
                        return [ 4 /*yield*/ , xi(t.sent()) ];

                      case 5:
                        return t.sent(), [ 3 /*break*/ , 6 ];

                      case 6:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        }, e.prototype.bu = function(e, n) {
            return t.__awaiter(this, void 0, void 0, (function() {
                var r;
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        this.nl("rejectFailedWrite()"), t.label = 1;

                      case 1:
                        return t.trys.push([ 1, 4, , 6 ]), [ 4 /*yield*/ , function(t, e) {
                            var n = v(t);
                            return n.persistence.runTransaction("Reject batch", "readwrite-primary", (function(t) {
                                var r;
                                return n.Gn.Rr(t, e).next((function(e) {
                                    return y(null !== e), r = e.keys(), n.Gn.br(t, e);
                                })).next((function() {
                                    return n.Gn.Cr(t);
                                })).next((function() {
                                    return n.Rh.Zn(t, r);
                                }));
                            }));
                        }(this.La, e) ];

                      case 2:
                        return r = t.sent(), 
                        // The local store may or may not be able to apply the write result and
                        // raise events immediately (depending on whether the watcher is caught up),
                        // so we raise user callbacks first so that they consistently happen before
                        // listen events.
                        this.cl(e, n), this.ll(e), this.Uc.Zu(e, "rejected", n), [ 4 /*yield*/ , this.hl(r) ];

                      case 3:
                        // The local store may or may not be able to apply the write result and
                        // raise events immediately (depending on whether the watcher is caught up),
                        // so we raise user callbacks first so that they consistently happen before
                        // listen events.
                        return t.sent(), [ 3 /*break*/ , 6 ];

                      case 4:
                        return [ 4 /*yield*/ , xi(t.sent()) ];

                      case 5:
                        return t.sent(), [ 3 /*break*/ , 6 ];

                      case 6:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        }, e.prototype._l = function(e) {
            return t.__awaiter(this, void 0, void 0, (function() {
                var n, r, i, o;
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        this.Bc.Ga() || h("SyncEngine", "The network is disabled. The task returned by 'awaitPendingWrites()' will not complete until the network is enabled."), 
                        t.label = 1;

                      case 1:
                        return t.trys.push([ 1, 3, , 4 ]), [ 4 /*yield*/ , function(t) {
                            var e = v(t);
                            return e.persistence.runTransaction("Get highest unacknowledged batch id", "readonly", (function(t) {
                                return e.Gn.Vr(t);
                            }));
                        }(this.La) ];

                      case 2:
                        return -1 === (n = t.sent()) ? [ 2 /*return*/ , void e.resolve() ] : ((r = this.Xc.get(n) || []).push(e), 
                        this.Xc.set(n, r), [ 3 /*break*/ , 4 ]);

                      case 3:
                        return i = t.sent(), o = ar(i, "Initialization of waitForPendingWrites() operation failed"), 
                        e.reject(o), [ 3 /*break*/ , 4 ];

                      case 4:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        }, 
        /**
         * Triggers the callbacks that are waiting for this batch id to get acknowledged by server,
         * if there are any.
         */
        e.prototype.ll = function(t) {
            (this.Xc.get(t) || []).forEach((function(t) {
                t.resolve();
            })), this.Xc.delete(t);
        }, 
        /** Reject all outstanding callbacks waiting for pending writes to complete. */ e.prototype.fl = function(t) {
            this.Xc.forEach((function(e) {
                e.forEach((function(e) {
                    e.reject(new x(D.CANCELLED, t));
                }));
            })), this.Xc.clear();
        }, e.prototype.ol = function(t, e) {
            var n = this.Jc[this.currentUser.$h()];
            n || (n = new $(w)), n = n.st(t, e), this.Jc[this.currentUser.$h()] = n;
        }, 
        /**
         * Resolves or rejects the user callback for the given batch and then discards
         * it.
         */
        e.prototype.cl = function(t, e) {
            var n = this.Jc[this.currentUser.$h()];
            // NOTE: Mutations restored from persistence won't have callbacks, so it's
            // okay for there to be no callback for this ID.
                    if (n) {
                var r = n.get(t);
                r && (e ? r.reject(e) : r.resolve(), n = n.remove(t)), this.Jc[this.currentUser.$h()] = n;
            }
        }, e.prototype.rl = function(t, e) {
            var n = this;
            void 0 === e && (e = null), this.Uc.sc(t);
            for (var r = 0, i = this.Kc.get(t); r < i.length; r++) {
                var o = i[r];
                this.jc.delete(o), e && this.Wc.dl(o, e);
            }
            this.Kc.delete(t), this.el && this.Yc.Ch(t).forEach((function(t) {
                n.Yc.Nr(t) || 
                // We removed the last reference for this key
                n.wl(t);
            }));
        }, e.prototype.wl = function(t) {
            // It's possible that the target already got removed because the query failed. In that case,
            // the key won't exist in `limboTargetsByKey`. Only do the cleanup if we still have the target.
            var e = this.zc.get(t);
            null !== e && (this.Bc.lu(e), this.zc = this.zc.remove(t), this.Hc.delete(e), this.ul());
        }, e.prototype.il = function(t, e) {
            for (var n = 0, r = e; n < r.length; n++) {
                var i = r[n];
                i instanceof to ? (this.Yc.Eo(i.key, t), this.Tl(i)) : i instanceof eo ? (h("SyncEngine", "Document no longer in limbo: " + i.key), 
                this.Yc.mo(i.key, t), this.Yc.Nr(i.key) || 
                // We removed the last reference for this key
                this.wl(i.key)) : d();
            }
        }, e.prototype.Tl = function(t) {
            var e = t.key;
            this.zc.get(e) || (h("SyncEngine", "New document in limbo: " + e), this.Gc.push(e), 
            this.ul());
        }, 
        /**
         * Starts listens for documents in limbo that are enqueued for resolution,
         * subject to a maximum number of concurrent resolutions.
         *
         * Without bounding the number of concurrent resolutions, the server can fail
         * with "resource exhausted" errors which can lead to pathological client
         * behavior as seen in https://github.com/firebase/firebase-js-sdk/issues/2683.
         */
        e.prototype.ul = function() {
            for (;this.Gc.length > 0 && this.zc.size < this.Qc; ) {
                var t = this.Gc.shift(), e = this.Zc.next();
                this.Hc.set(e, new io(t)), this.zc = this.zc.st(t, e), this.Bc.listen(new K(pn(hn(t.path)), e, 2 /* LimboResolution */ , Wn.Es));
            }
        }, 
        // Visible for testing
        e.prototype.El = function() {
            return this.zc;
        }, 
        // Visible for testing
        e.prototype.Il = function() {
            return this.Gc;
        }, e.prototype.hl = function(e, n) {
            return t.__awaiter(this, void 0, void 0, (function() {
                var r, i, o, s = this;
                return t.__generator(this, (function(u) {
                    switch (u.label) {
                      case 0:
                        return r = [], i = [], o = [], this.jc.forEach((function(t, u) {
                            o.push(Promise.resolve().then((function() {
                                var t = u.view.Sc(e);
                                return t.Nc ? Si(s.La, u.query, 
                                /* usePreviousResults= */ !1).then((function(e) {
                                    var n = e.documents;
                                    return u.view.Sc(n, t);
                                })) : t;
                                // The query has a limit and some docs were removed, so we need
                                // to re-run the query against the local store to make sure we
                                // didn't lose any good docs that had been past the limit.
                                                    })).then((function(t) {
                                var e = n && n.Wt.get(u.targetId), o = u.view.Un(t, 
                                /* updateLimboDocuments= */ s.el, e);
                                if (s.il(u.targetId, o.$c), o.snapshot) {
                                    s.el && s.Uc.oc(u.targetId, o.snapshot.fromCache ? "not-current" : "current"), r.push(o.snapshot);
                                    var a = Qn._s(u.targetId, o.snapshot);
                                    i.push(a);
                                }
                            })));
                        })), [ 4 /*yield*/ , Promise.all(o) ];

                      case 1:
                        return u.sent(), this.Wc.Ea(r), [ 4 /*yield*/ , function(e, n) {
                            return t.__awaiter(this, void 0, void 0, (function() {
                                var r, i, o, s, u, a, c, f, l;
                                return t.__generator(this, (function(t) {
                                    switch (t.label) {
                                      case 0:
                                        r = v(e), t.label = 1;

                                      case 1:
                                        return t.trys.push([ 1, 3, , 4 ]), [ 4 /*yield*/ , r.persistence.runTransaction("notifyLocalViewChanges", "readwrite", (function(t) {
                                            return Fn.forEach(n, (function(e) {
                                                return Fn.forEach(e.cs, (function(n) {
                                                    return r.persistence.dr.Eo(t, e.targetId, n);
                                                })).next((function() {
                                                    return Fn.forEach(e.ls, (function(n) {
                                                        return r.persistence.dr.mo(t, e.targetId, n);
                                                    }));
                                                }));
                                            }));
                                        })) ];

                                      case 2:
                                        return t.sent(), [ 3 /*break*/ , 4 ];

                                      case 3:
                                        if (!$n(i = t.sent())) throw i;
                                        // If `notifyLocalViewChanges` fails, we did not advance the sequence
                                        // number for the documents that were included in this transaction.
                                        // This might trigger them to be deleted earlier than they otherwise
                                        // would have, but it should not invalidate the integrity of the data.
                                                                            return h("LocalStore", "Failed to update sequence numbers: " + i), 
                                        [ 3 /*break*/ , 4 ];

                                      case 4:
                                        for (o = 0, s = n; o < s.length; o++) u = s[o], a = u.targetId, u.fromCache || (c = r.Eh.get(a), 
                                        f = c.Z, l = c.nt(f), 
                                        // Advance the last limbo free snapshot version
                                        r.Eh = r.Eh.st(a, l));
                                        return [ 2 /*return*/ ];
                                    }
                                }));
                            }));
                        }(this.La, i) ];

                      case 2:
                        return u.sent(), [ 2 /*return*/ ];
                    }
                }));
            }));
        }, e.prototype.nl = function(t) {}, e.prototype.vu = function(e) {
            return t.__awaiter(this, void 0, void 0, (function() {
                var n;
                return t.__generator(this, (function(r) {
                    switch (r.label) {
                      case 0:
                        return this.currentUser.isEqual(e) ? [ 3 /*break*/ , 3 ] : (h("SyncEngine", "User change. New user:", e.$h()), 
                        [ 4 /*yield*/ , 
                        /**
                     * Tells the LocalStore that the currently authenticated user has changed.
                     *
                     * In response the local store switches the mutation queue to the new user and
                     * returns any resulting document changes.
                     */
                        // PORTING NOTE: Android and iOS only return the documents affected by the
                        // change.
                        function(e, n) {
                            return t.__awaiter(this, void 0, void 0, (function() {
                                var r, i, o, s;
                                return t.__generator(this, (function(t) {
                                    switch (t.label) {
                                      case 0:
                                        return r = v(e), i = r.Gn, o = r.Rh, [ 4 /*yield*/ , r.persistence.runTransaction("Handle user change", "readonly", (function(t) {
                                            // Swap out the mutation queue, grabbing the pending mutation batches
                                            // before and after.
                                            var e;
                                            return r.Gn.yr(t).next((function(s) {
                                                return e = s, i = r.persistence.oh(n), 
                                                // Recreate our LocalDocumentsView using the new
                                                // MutationQueue.
                                                o = new zn(r.Ah, i, r.persistence.uh()), i.yr(t);
                                            })).next((function(n) {
                                                for (var r = [], i = [], s = ht(), u = 0, a = e
                                                // Union the old/new changed keys.
                                                ; u < a.length; u++) {
                                                    var c = a[u];
                                                    r.push(c.batchId);
                                                    for (var h = 0, f = c.mutations; h < f.length; h++) {
                                                        var l = f[h];
                                                        s = s.add(l.key);
                                                    }
                                                }
                                                for (var p = 0, d = n; p < d.length; p++) {
                                                    var y = d[p];
                                                    i.push(y.batchId);
                                                    for (var v = 0, g = y.mutations; v < g.length; v++) {
                                                        var m = g[v];
                                                        s = s.add(m.key);
                                                    }
                                                }
                                                // Return the set of all (potentially) changed documents and the list
                                                // of mutation batch IDs that were affected by change.
                                                                                            return o.Zn(t, s).next((function(t) {
                                                    return {
                                                        ml: t,
                                                        Al: r,
                                                        Rl: i
                                                    };
                                                }));
                                            }));
                                        })) ];

                                      case 1:
                                        return s = t.sent(), [ 2 /*return*/ , (r.Gn = i, r.Rh = o, r.Th.Ph(r.Rh), s) ];
                                    }
                                }));
                            }));
                        }(this.La, e) ]);

                      case 1:
                        return n = r.sent(), this.currentUser = e, 
                        // Fails tasks waiting for pending writes requested by previous user.
                        this.fl("'waitForPendingWrites' promise is rejected due to a user change."), 
                        // TODO(b/114226417): Consider calling this only in the primary tab.
                        this.Uc.ac(e, n.Al, n.Rl), [ 4 /*yield*/ , this.hl(n.ml) ];

                      case 2:
                        r.sent(), r.label = 3;

                      case 3:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        }, e.prototype.Oe = function(t) {
            var e = this.Hc.get(t);
            if (e && e.qc) return ht().add(e.key);
            var n = ht(), r = this.Kc.get(t);
            if (!r) return n;
            for (var i = 0, o = r; i < o.length; i++) {
                var s = o[i], u = this.jc.get(s);
                n = n.Nt(u.view.vc);
            }
            return n;
        }, e;
    }();

    /**
     * Holds the state of a query target, including its target ID and whether the
     * target is 'not-current', 'current' or 'rejected'.
     */
    // Visible for testing
    /**
     * Reconcile the list of synced documents in an existing view with those
     * from persistence.
     */
    function so(e, n) {
        return t.__awaiter(this, void 0, void 0, (function() {
            var r, i, o;
            return t.__generator(this, (function(t) {
                switch (t.label) {
                  case 0:
                    return [ 4 /*yield*/ , Si((r = v(e)).La, n.query, 
                    /* usePreviousResults= */ !0) ];

                  case 1:
                    return i = t.sent(), o = n.view.Mc(i), [ 2 /*return*/ , (r.el && r.il(n.targetId, o.$c), 
                    o) ];
                }
            }));
        }));
    }

    /** Applies a mutation state to an existing batch.  */
    // PORTING NOTE: Multi-Tab only.
    function uo(e, n, r, i) {
        return t.__awaiter(this, void 0, void 0, (function() {
            var o, s;
            return t.__generator(this, (function(t) {
                switch (t.label) {
                  case 0:
                    return (o = v(e)).nl("applyBatchState()"), [ 4 /*yield*/ , function(t, e) {
                        var n = v(t), r = v(n.Gn);
                        return n.persistence.runTransaction("Lookup mutation documents", "readonly", (function(t) {
                            return r.Pr(t, e).next((function(e) {
                                return e ? n.Rh.Zn(t, e) : Fn.resolve(null);
                            }));
                        }));
                    }(o.La, n) ];

                  case 1:
                    return null === (s = t.sent()) ? [ 3 /*break*/ , 6 ] : "pending" !== r ? [ 3 /*break*/ , 3 ] : [ 4 /*yield*/ , o.Bc.hu() ];

                  case 2:
                    // If we are the primary client, we need to send this write to the
                    // backend. Secondary clients will ignore these writes since their remote
                    // connection is disabled.
                    return t.sent(), [ 3 /*break*/ , 4 ];

                  case 3:
                    "acknowledged" === r || "rejected" === r ? (
                    // NOTE: Both these methods are no-ops for batches that originated from
                    // other clients.
                    o.cl(n, i || null), function(t, e) {
                        v(v(t).Gn).Sr(e);
                    }(o.La, n)) : d(), t.label = 4;

                  case 4:
                    return [ 4 /*yield*/ , o.hl(s) ];

                  case 5:
                    return t.sent(), [ 3 /*break*/ , 7 ];

                  case 6:
                    // A throttled tab may not have seen the mutation before it was completed
                    // and removed from the mutation queue, in which case we won't have cached
                    // the affected documents. In this case we can safely ignore the update
                    // since that means we didn't apply the mutation locally at all (if we
                    // had, we would have cached the affected documents), and so we will just
                    // see any resulting document changes via normal remote document updates
                    // as applicable.
                    h("SyncEngine", "Cannot apply mutation batch with id: " + n), t.label = 7;

                  case 7:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }

    /** Applies a query target change from a different tab. */
    // PORTING NOTE: Multi-Tab only.
    function ao(e, n) {
        return t.__awaiter(this, void 0, void 0, (function() {
            var r, i, o, s, u, a, c, h;
            return t.__generator(this, (function(t) {
                switch (t.label) {
                  case 0:
                    return r = v(e), !0 !== n || !0 === r.tl ? [ 3 /*break*/ , 3 ] : (i = r.Uc.zu(), 
                    [ 4 /*yield*/ , co(r, i.N()) ]);

                  case 1:
                    return o = t.sent(), r.tl = !0, [ 4 /*yield*/ , r.Bc.Su(!0) ];

                  case 2:
                    for (t.sent(), s = 0, u = o; s < u.length; s++) a = u[s], r.Bc.listen(a);
                    return [ 3 /*break*/ , 7 ];

                  case 3:
                    return !1 !== n || !1 === r.tl ? [ 3 /*break*/ , 7 ] : (c = [], h = Promise.resolve(), 
                    r.Kc.forEach((function(t, e) {
                        r.Uc.ic(e) ? c.push(e) : h = h.then((function() {
                            return r.rl(e), Ai(r.La, e, 
                            /*keepPersistedTargetData=*/ !0);
                        })), r.Bc.lu(e);
                    })), [ 4 /*yield*/ , h ]);

                  case 4:
                    return t.sent(), [ 4 /*yield*/ , co(r, c) ];

                  case 5:
                    return t.sent(), 
                    // PORTING NOTE: Multi-Tab only.
                    function(t) {
                        var e = v(t);
                        e.Hc.forEach((function(t, n) {
                            e.Bc.lu(n);
                        })), e.Yc.Nh(), e.Hc = new Map, e.zc = new $(U.P);
                    }(r), r.tl = !1, [ 4 /*yield*/ , r.Bc.Su(!1) ];

                  case 6:
                    t.sent(), t.label = 7;

                  case 7:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }

    function co(e, n, r) {
        return t.__awaiter(this, void 0, void 0, (function() {
            var r, i, o, s, u, a, c, h, f, l, p, d, y, g;
            return t.__generator(this, (function(t) {
                switch (t.label) {
                  case 0:
                    r = v(e), i = [], o = [], s = 0, u = n, t.label = 1;

                  case 1:
                    return s < u.length ? (a = u[s], c = void 0, (h = r.Kc.get(a)) && 0 !== h.length ? [ 4 /*yield*/ , Ni(r.La, pn(h[0])) ] : [ 3 /*break*/ , 7 ]) : [ 3 /*break*/ , 13 ];

                  case 2:
                    // For queries that have a local View, we fetch their current state
                    // from LocalStore (as the resume token and the snapshot version
                    // might have changed) and reconcile their views with the persisted
                    // state (the list of syncedDocuments may have gotten out of sync).
                    c = t.sent(), f = 0, l = h, t.label = 3;

                  case 3:
                    return f < l.length ? (p = l[f], d = r.jc.get(p), [ 4 /*yield*/ , so(r, d) ]) : [ 3 /*break*/ , 6 ];

                  case 4:
                    (y = t.sent()).snapshot && o.push(y.snapshot), t.label = 5;

                  case 5:
                    return f++, [ 3 /*break*/ , 3 ];

                  case 6:
                    return [ 3 /*break*/ , 11 ];

                  case 7:
                    return [ 4 /*yield*/ , Di(r.La, a) ];

                  case 8:
                    return g = t.sent(), [ 4 /*yield*/ , Ni(r.La, g) ];

                  case 9:
                    return c = t.sent(), [ 4 /*yield*/ , r.sl(ho(g), a, 
                    /*current=*/ !1) ];

                  case 10:
                    t.sent(), t.label = 11;

                  case 11:
                    i.push(c), t.label = 12;

                  case 12:
                    return s++, [ 3 /*break*/ , 1 ];

                  case 13:
                    return [ 2 /*return*/ , (r.Wc.Ea(o), i) ];
                }
            }));
        }));
    }

    /**
     * Creates a `Query` object from the specified `Target`. There is no way to
     * obtain the original `Query`, so we synthesize a `Query` from the `Target`
     * object.
     *
     * The synthesized result might be different from the original `Query`, but
     * since the synthesized `Query` should return the same results as the
     * original one (only the presentation of results might differ), the potential
     * difference will not cause issues.
     */
    // PORTING NOTE: Multi-Tab only.
    function ho(t) {
        return cn(t.path, t.collectionGroup, t.orderBy, t.filters, t.limit, "F" /* First */ , t.startAt, t.endAt);
    }

    /** Returns the IDs of the clients that are currently active. */
    // PORTING NOTE: Multi-Tab only.
    function fo(t) {
        var e = v(t);
        return v(v(e.La).persistence).rh();
    }

    /** Applies a query target change from a different tab. */
    // PORTING NOTE: Multi-Tab only.
    function lo(e, n, r, i) {
        return t.__awaiter(this, void 0, void 0, (function() {
            var o, s, u;
            return t.__generator(this, (function(t) {
                switch (t.label) {
                  case 0:
                    return (o = v(e)).tl ? (
                    // If we receive a target state notification via WebStorage, we are
                    // either already secondary or another tab has taken the primary lease.
                    h("SyncEngine", "Ignoring unexpected query state notification."), [ 3 /*break*/ , 8 ]) : [ 3 /*break*/ , 1 ];

                  case 1:
                    if (!o.Kc.has(n)) return [ 3 /*break*/ , 8 ];
                    switch (r) {
                      case "current":
                      case "not-current":
                        return [ 3 /*break*/ , 2 ];

                      case "rejected":
                        return [ 3 /*break*/ , 5 ];
                    }
                    return [ 3 /*break*/ , 7 ];

                  case 2:
                    return [ 4 /*yield*/ , function(t) {
                        var e = v(t), n = v(e.Ah);
                        return e.persistence.runTransaction("Get new document changes", "readonly", (function(t) {
                            return n.Ur(t, e.mh);
                        })).then((function(t) {
                            var n = t.Qr, r = t.readTime;
                            return e.mh = r, n;
                        }));
                    }(o.La) ];

                  case 3:
                    return s = t.sent(), u = vt.zt(n, "current" === r), [ 4 /*yield*/ , o.hl(s, u) ];

                  case 4:
                    return t.sent(), [ 3 /*break*/ , 8 ];

                  case 5:
                    return [ 4 /*yield*/ , Ai(o.La, n, 
                    /* keepPersistedTargetData */ !0) ];

                  case 6:
                    return t.sent(), o.rl(n, i), [ 3 /*break*/ , 8 ];

                  case 7:
                    d(), t.label = 8;

                  case 8:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }

    /** Adds or removes Watch targets for queries from different tabs. */ function po(e, n, r) {
        return t.__awaiter(this, void 0, void 0, (function() {
            var i, o, s, u, a, c, f, l, p, d;
            return t.__generator(this, (function(y) {
                switch (y.label) {
                  case 0:
                    if (!(i = v(e)).tl) return [ 3 /*break*/ , 10 ];
                    o = 0, s = n, y.label = 1;

                  case 1:
                    return o < s.length ? (u = s[o], i.Kc.has(u) ? (
                    // A target might have been added in a previous attempt
                    h("SyncEngine", "Adding an already active target " + u), [ 3 /*break*/ , 5 ]) : [ 4 /*yield*/ , Di(i.La, u) ]) : [ 3 /*break*/ , 6 ];

                  case 2:
                    return a = y.sent(), [ 4 /*yield*/ , Ni(i.La, a) ];

                  case 3:
                    return c = y.sent(), [ 4 /*yield*/ , i.sl(ho(a), c.targetId, 
                    /*current=*/ !1) ];

                  case 4:
                    y.sent(), i.Bc.listen(c), y.label = 5;

                  case 5:
                    return o++, [ 3 /*break*/ , 1 ];

                  case 6:
                    f = function(e) {
                        return t.__generator(this, (function(t) {
                            switch (t.label) {
                              case 0:
                                return i.Kc.has(e) ? [ 4 /*yield*/ , Ai(i.La, e, 
                                /* keepPersistedTargetData */ !1).then((function() {
                                    i.Bc.lu(e), i.rl(e);
                                })).catch(xi) ] : [ 3 /*break*/ , 2 ];

                                // Release queries that are still active.
                                                          case 1:
                                // Release queries that are still active.
                                t.sent(), t.label = 2;

                              case 2:
                                return [ 2 /*return*/ ];
                            }
                        }));
                    }, l = 0, p = r, y.label = 7;

                  case 7:
                    return l < p.length ? (d = p[l], [ 5 /*yield**/ , f(d) ]) : [ 3 /*break*/ , 10 ];

                  case 8:
                    y.sent(), y.label = 9;

                  case 9:
                    return l++, [ 3 /*break*/ , 7 ];

                  case 10:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Holds the listeners and the last received ViewSnapshot for a query being
     * tracked by EventManager.
     */ var yo = function() {
        this.Pl = void 0, this.listeners = [];
    }, vo = /** @class */ function() {
        function e(t) {
            this.fu = t, this.gl = new S((function(t) {
                return mn(t);
            }), gn), this.onlineState = "Unknown" /* Unknown */ , this.Vl = new Set, this.fu.subscribe(this);
        }
        return e.prototype.listen = function(e) {
            return t.__awaiter(this, void 0, void 0, (function() {
                var n, r, i, o, s, u;
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        if (n = e.query, r = !1, (i = this.gl.get(n)) || (r = !0, i = new yo), !r) return [ 3 /*break*/ , 4 ];
                        t.label = 1;

                      case 1:
                        return t.trys.push([ 1, 3, , 4 ]), o = i, [ 4 /*yield*/ , this.fu.listen(n) ];

                      case 2:
                        return o.Pl = t.sent(), [ 3 /*break*/ , 4 ];

                      case 3:
                        return s = t.sent(), u = ar(s, "Initialization of query '" + wn(e.query) + "' failed"), 
                        [ 2 /*return*/ , void e.onError(u) ];

                      case 4:
                        return this.gl.set(n, i), i.listeners.push(e), 
                        // Run global snapshot listeners if a consistent snapshot has been emitted.
                        e.xc(this.onlineState), i.Pl && e.yl(i.Pl) && this.pl(), [ 2 /*return*/ ];
                    }
                }));
            }));
        }, e.prototype.lu = function(e) {
            return t.__awaiter(this, void 0, void 0, (function() {
                var n, r, i, o;
                return t.__generator(this, (function(t) {
                    return n = e.query, r = !1, (i = this.gl.get(n)) && (o = i.listeners.indexOf(e)) >= 0 && (i.listeners.splice(o, 1), 
                    r = 0 === i.listeners.length), r ? [ 2 /*return*/ , (this.gl.delete(n), this.fu.lu(n)) ] : [ 2 /*return*/ ];
                }));
            }));
        }, e.prototype.Ea = function(t) {
            for (var e = !1, n = 0, r = t; n < r.length; n++) {
                var i = r[n], o = i.query, s = this.gl.get(o);
                if (s) {
                    for (var u = 0, a = s.listeners; u < a.length; u++) {
                        a[u].yl(i) && (e = !0);
                    }
                    s.Pl = i;
                }
            }
            e && this.pl();
        }, e.prototype.dl = function(t, e) {
            var n = this.gl.get(t);
            if (n) for (var r = 0, i = n.listeners; r < i.length; r++) {
                i[r].onError(e);
            }
            // Remove all listeners. NOTE: We don't need to call syncEngine.unlisten()
            // after an error.
                    this.gl.delete(t);
        }, e.prototype.al = function(t) {
            this.onlineState = t;
            var e = !1;
            this.gl.forEach((function(n, r) {
                for (var i = 0, o = r.listeners; i < o.length; i++) {
                    // Run global snapshot listeners if a consistent snapshot has been emitted.
                    o[i].xc(t) && (e = !0);
                }
            })), e && this.pl();
        }, e.prototype.bl = function(t) {
            this.Vl.add(t), 
            // Immediately fire an initial event, indicating all existing listeners
            // are in-sync.
            t.next();
        }, e.prototype.vl = function(t) {
            this.Vl.delete(t);
        }, 
        // Call all global snapshot listeners that have been set.
        e.prototype.pl = function() {
            this.Vl.forEach((function(t) {
                t.next();
            }));
        }, e;
    }(), go = /** @class */ function() {
        function t(t, e, n) {
            this.query = t, this.Sl = e, 
            /**
                 * Initial snapshots (e.g. from cache) may not be propagated to the wrapped
                 * observer. This flag is set to true once we've actually raised an event.
                 */
            this.Dl = !1, this.Cl = null, this.onlineState = "Unknown" /* Unknown */ , this.options = n || {}
            /**
         * Applies the new ViewSnapshot to this listener, raising a user-facing event
         * if applicable (depending on what changed, whether the user has opted into
         * metadata-only changes, etc.). Returns true if a user-facing event was
         * indeed raised.
         */;
        }
        return t.prototype.yl = function(t) {
            if (!this.options.includeMetadataChanges) {
                for (
                // Remove the metadata only changes.
                var e = [], n = 0, r = t.docChanges; n < r.length; n++) {
                    var i = r[n];
                    3 /* Metadata */ !== i.type && e.push(i);
                }
                t = new yt(t.query, t.docs, t.Lt, e, t.qt, t.fromCache, t.Bt, 
                /* excludesMetadataChanges= */ !0);
            }
            var o = !1;
            return this.Dl ? this.Nl(t) && (this.Sl.next(t), o = !0) : this.Fl(t, this.onlineState) && (this.kl(t), 
            o = !0), this.Cl = t, o;
        }, t.prototype.onError = function(t) {
            this.Sl.error(t);
        }, 
        /** Returns whether a snapshot was raised. */ t.prototype.xc = function(t) {
            this.onlineState = t;
            var e = !1;
            return this.Cl && !this.Dl && this.Fl(this.Cl, t) && (this.kl(this.Cl), e = !0), 
            e;
        }, t.prototype.Fl = function(t, e) {
            // Always raise the first event when we're synced
            if (!t.fromCache) return !0;
            // NOTE: We consider OnlineState.Unknown as online (it should become Offline
            // or Online if we wait long enough).
                    var n = "Offline" /* Offline */ !== e;
            // Don't raise the event if we're online, aren't synced yet (checked
            // above) and are waiting for a sync.
                    return !(this.options.$l && n || t.docs._() && "Offline" /* Offline */ !== e);
            // Raise data from cache if we have any documents or we are offline
            }, t.prototype.Nl = function(t) {
            // We don't need to handle includeDocumentMetadataChanges here because
            // the Metadata only changes have already been stripped out if needed.
            // At this point the only changes we will see are the ones we should
            // propagate.
            if (t.docChanges.length > 0) return !0;
            var e = this.Cl && this.Cl.hasPendingWrites !== t.hasPendingWrites;
            return !(!t.Bt && !e) && !0 === this.options.includeMetadataChanges;
            // Generally we should have hit one of the cases above, but it's possible
            // to get here if there were only metadata docChanges and they got
            // stripped out.
            }, t.prototype.kl = function(t) {
            t = yt.Qt(t.query, t.docs, t.qt, t.fromCache), this.Dl = !0, this.Sl.next(t);
        }, t;
    }(), mo = /** @class */ function() {
        function t() {}
        return t.prototype.Ph = function(t) {
            this.xl = t;
        }, t.prototype.ns = function(t, e, r, i) {
            var o = this;
            // Queries that match all documents don't benefit from using
            // IndexFreeQueries. It is more efficient to scan all documents in a
            // collection, rather than to perform individual lookups.
                    return e.hn() || r.isEqual(L.min()) ? this.Ol(t, e) : this.xl.Zn(t, i).next((function(s) {
                var u = o.Ml(e, s);
                return (e.an() || e.un()) && o.Nc(e.nn, u, i, r) ? o.Ol(t, e) : (c() <= n.LogLevel.DEBUG && h("IndexFreeQueryEngine", "Re-using previous result from %s to execute query: %s", r.toString(), wn(e)), 
                o.xl.ns(t, e, r).next((function(t) {
                    // We merge `previousResults` into `updateResults`, since
                    // `updateResults` is already a DocumentMap. If a document is
                    // contained in both lists, then its contents are the same.
                    return u.forEach((function(e) {
                        t = t.st(e.key, e);
                    })), t;
                })));
            }));
            // Queries that have never seen a snapshot without limbo free documents
            // should also be run as a full collection scan.
            }, 
        /** Applies the query filter and sorting to the provided documents.  */ t.prototype.Ml = function(t, e) {
            // Sort the documents and re-apply the query filter since previously
            // matching documents do not necessarily still match the query.
            var n = new et(_n(t));
            return e.forEach((function(e, r) {
                r instanceof rn && bn(t, r) && (n = n.add(r));
            })), n;
        }, 
        /**
         * Determines if a limit query needs to be refilled from cache, making it
         * ineligible for index-free execution.
         *
         * @param sortedPreviousResults The documents that matched the query when it
         * was last synchronized, sorted by the query's comparator.
         * @param remoteKeys The document keys that matched the query at the last
         * snapshot.
         * @param limboFreeSnapshotVersion The version of the snapshot when the query
         * was last synchronized.
         */
        t.prototype.Nc = function(t, e, n, r) {
            // The query needs to be refilled if a previously matching document no
            // longer matches.
            if (n.size !== e.size) return !0;
            // Limit queries are not eligible for index-free query execution if there is
            // a potential that an older document from cache now sorts before a document
            // that was previously part of the limit. This, however, can only happen if
            // the document at the edge of the limit goes out of limit.
            // If a document that is not the limit boundary sorts differently,
            // the boundary of the limit itself did not change and documents from cache
            // will continue to be "rejected" by this boundary. Therefore, we can ignore
            // any modifications that don't affect the last document.
                    var i = "F" /* First */ === t ? e.last() : e.first();
            return !!i && (i.hasPendingWrites || i.version.o(r) > 0);
        }, t.prototype.Ol = function(t, e) {
            return c() <= n.LogLevel.DEBUG && h("IndexFreeQueryEngine", "Using full collection scan to execute query:", wn(e)), 
            this.xl.ns(t, e, L.min());
        }, t;
    }(), wo = /** @class */ function() {
        function t(t, e) {
            this.zn = t, this.dr = e, 
            /**
                 * The set of all mutations that have been sent but not yet been applied to
                 * the backend.
                 */
            this.Gn = [], 
            /** Next value to use when assigning sequential IDs to each mutation batch. */
            this.Ll = 1, 
            /** An ordered mapping between documents and the mutations batch IDs. */
            this.ql = new et(Li.yh);
        }
        return t.prototype.Ir = function(t) {
            return Fn.resolve(0 === this.Gn.length);
        }, t.prototype.mr = function(t, e, n, r) {
            var i = this.Ll;
            this.Ll++, this.Gn.length > 0 && this.Gn[this.Gn.length - 1];
            var o = new qn(i, e, n, r);
            this.Gn.push(o);
            // Track references by document key and index collection parents.
            for (var s = 0, u = r; s < u.length; s++) {
                var a = u[s];
                this.ql = this.ql.add(new Li(a.key, i)), this.zn.Ar(t, a.key.path.p());
            }
            return Fn.resolve(o);
        }, t.prototype.Rr = function(t, e) {
            return Fn.resolve(this.Bl(e));
        }, t.prototype.gr = function(t, e) {
            var n = e + 1, r = this.Ul(n), i = r < 0 ? 0 : r;
            // The requested batchId may still be out of range so normalize it to the
            // start of the queue.
                    return Fn.resolve(this.Gn.length > i ? this.Gn[i] : null);
        }, t.prototype.Vr = function() {
            return Fn.resolve(0 === this.Gn.length ? -1 : this.Ll - 1);
        }, t.prototype.yr = function(t) {
            return Fn.resolve(this.Gn.slice());
        }, t.prototype.Yn = function(t, e) {
            var n = this, r = new Li(e, 0), i = new Li(e, Number.POSITIVE_INFINITY), o = [];
            return this.ql.St([ r, i ], (function(t) {
                var e = n.Bl(t.kh);
                o.push(e);
            })), Fn.resolve(o);
        }, t.prototype.es = function(t, e) {
            var n = this, r = new et(w);
            return e.forEach((function(t) {
                var e = new Li(t, 0), i = new Li(t, Number.POSITIVE_INFINITY);
                n.ql.St([ e, i ], (function(t) {
                    r = r.add(t.kh);
                }));
            })), Fn.resolve(this.Ql(r));
        }, t.prototype.as = function(t, e) {
            // Use the query path as a prefix for testing if a document matches the
            // query.
            var n = e.path, r = n.length + 1, i = n;
            // Construct a document reference for actually scanning the index. Unlike
            // the prefix the document key in this reference must have an even number of
            // segments. The empty segment can be used a suffix of the query path
            // because it precedes all other segments in an ordered traversal.
                    U.j(i) || (i = i.child(""));
            var o = new Li(new U(i), 0), s = new et(w);
            // Find unique batchIDs referenced by all documents potentially matching the
            // query.
                    return this.ql.Dt((function(t) {
                var e = t.key.path;
                return !!n.D(e) && (
                // Rows with document keys more than one segment longer than the query
                // path can't be matches. For example, a query on 'rooms' can't match
                // the document /rooms/abc/messages/xyx.
                // TODO(mcg): we'll need a different scanner when we implement
                // ancestor queries.
                e.length === r && (s = s.add(t.kh)), !0);
            }), o), Fn.resolve(this.Ql(s));
        }, t.prototype.Ql = function(t) {
            var e = this, n = [];
            // Construct an array of matching batches, sorted by batchID to ensure that
            // multiple mutations affecting the same document key are applied in order.
                    return t.forEach((function(t) {
                var r = e.Bl(t);
                null !== r && n.push(r);
            })), n;
        }, t.prototype.br = function(t, e) {
            var n = this;
            y(0 === this.Wl(e.batchId, "removed")), this.Gn.shift();
            var r = this.ql;
            return Fn.forEach(e.mutations, (function(i) {
                var o = new Li(i.key, e.batchId);
                return r = r.delete(o), n.dr.Dr(t, i.key);
            })).next((function() {
                n.ql = r;
            }));
        }, t.prototype.Sr = function(t) {
            // No-op since the memory mutation queue does not maintain a separate cache.
        }, t.prototype.Nr = function(t, e) {
            var n = new Li(e, 0), r = this.ql.Ct(n);
            return Fn.resolve(e.isEqual(r && r.key));
        }, t.prototype.Cr = function(t) {
            return this.Gn.length, Fn.resolve();
        }, 
        /**
         * Finds the index of the given batchId in the mutation queue and asserts that
         * the resulting index is within the bounds of the queue.
         *
         * @param batchId The batchId to search for
         * @param action A description of what the caller is doing, phrased in passive
         * form (e.g. "acknowledged" in a routine that acknowledges batches).
         */
        t.prototype.Wl = function(t, e) {
            return this.Ul(t);
        }, 
        /**
         * Finds the index of the given batchId in the mutation queue. This operation
         * is O(1).
         *
         * @return The computed index of the batch with the given batchId, based on
         * the state of the queue. Note this index can be negative if the requested
         * batchId has already been remvoed from the queue or past the end of the
         * queue if the batchId is larger than the last added batch.
         */
        t.prototype.Ul = function(t) {
            return 0 === this.Gn.length ? 0 : t - this.Gn[0].batchId;
            // Examine the front of the queue to figure out the difference between the
            // batchId and indexes in the array. Note that since the queue is ordered
            // by batchId, if the first batch has a larger batchId then the requested
            // batchId doesn't exist in the queue.
            }, 
        /**
         * A version of lookupMutationBatch that doesn't return a promise, this makes
         * other functions that uses this code easier to read and more efficent.
         */
        t.prototype.Bl = function(t) {
            var e = this.Ul(t);
            return e < 0 || e >= this.Gn.length ? null : this.Gn[e];
        }, t;
    }(), bo = /** @class */ function() {
        /**
         * @param sizer Used to assess the size of a document. For eager GC, this is expected to just
         * return 0 to avoid unnecessarily doing the work of calculating the size.
         */
        function t(t, e) {
            this.zn = t, this.jl = e, 
            /** Underlying cache of documents and their read times. */
            this.docs = new $(U.P), 
            /** Size of all cached documents. */
            this.size = 0
            /**
         * Adds the supplied entry to the cache and updates the cache size as appropriate.
         *
         * All calls of `addEntry`  are required to go through the RemoteDocumentChangeBuffer
         * returned by `newChangeBuffer()`.
         */;
        }
        return t.prototype.xn = function(t, e, n) {
            var r = e.key, i = this.docs.get(r), o = i ? i.size : 0, s = this.jl(e);
            return this.docs = this.docs.st(r, {
                Or: e,
                size: s,
                readTime: n
            }), this.size += s - o, this.zn.Ar(t, r.path.p());
        }, 
        /**
         * Removes the specified entry from the cache and updates the cache size as appropriate.
         *
         * All calls of `removeEntry` are required to go through the RemoteDocumentChangeBuffer
         * returned by `newChangeBuffer()`.
         */
        t.prototype.Mn = function(t) {
            var e = this.docs.get(t);
            e && (this.docs = this.docs.remove(t), this.size -= e.size);
        }, t.prototype.Ln = function(t, e) {
            var n = this.docs.get(e);
            return Fn.resolve(n ? n.Or : null);
        }, t.prototype.getEntries = function(t, e) {
            var n = this, r = ot();
            return e.forEach((function(t) {
                var e = n.docs.get(t);
                r = r.st(t, e ? e.Or : null);
            })), Fn.resolve(r);
        }, t.prototype.ns = function(t, e, n) {
            for (var r = ut(), i = new U(e.path.child("")), o = this.docs.ct(i)
            // Documents are ordered by key, so we can use a prefix scan to narrow down
            // the documents we need to match the query against.
            ; o.Tt(); ) {
                var s = o.wt(), u = s.key, a = s.value, c = a.Or, h = a.readTime;
                if (!e.path.D(u.path)) break;
                h.o(n) <= 0 || c instanceof rn && bn(e, c) && (r = r.st(c.key, c));
            }
            return Fn.resolve(r);
        }, t.prototype.Kl = function(t, e) {
            return Fn.forEach(this.docs, (function(t) {
                return e(t);
            }));
        }, t.prototype.jr = function(e) {
            // `trackRemovals` is ignores since the MemoryRemoteDocumentCache keeps
            // a separate changelog and does not need special handling for removals.
            return new t.Kr(this);
        }, t.prototype.zr = function(t) {
            return Fn.resolve(this.size);
        }, t;
    }();

    /**
     * EventManager is responsible for mapping queries to query event emitters.
     * It handles "fan-out". -- Identical queries will re-use the same watch on the
     * backend.
     */
    /**
     * Handles the details of adding and updating documents in the MemoryRemoteDocumentCache.
     */
    bo.Kr = /** @class */ function(e) {
        function n(t) {
            var n = this;
            return (n = e.call(this) || this).Hr = t, n;
        }
        return t.__extends(n, e), n.prototype.Un = function(t) {
            var e = this, n = [];
            return this.Fn.forEach((function(r, i) {
                i ? n.push(e.Hr.xn(t, i, e.readTime)) : e.Hr.Mn(r);
            })), Fn.Cn(n);
        }, n.prototype.qn = function(t, e) {
            return this.Hr.Ln(t, e);
        }, n.prototype.Bn = function(t, e) {
            return this.Hr.getEntries(t, e);
        }, n;
    }(Gn);

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var _o = /** @class */ function() {
        function t(t) {
            this.persistence = t, 
            /**
                 * Maps a target to the data about that target
                 */
            this.Gl = new S((function(t) {
                return j(t);
            }), B), 
            /** The last received snapshot version. */
            this.lastRemoteSnapshotVersion = L.min(), 
            /** The highest numbered target ID encountered. */
            this.highestTargetId = 0, 
            /** The highest sequence number encountered. */
            this.zl = 0, 
            /**
                 * A ordered bidirectional mapping between documents and the remote target
                 * IDs.
                 */
            this.Hl = new ki, this.targetCount = 0, this.Yl = ui.to();
        }
        return t.prototype.be = function(t, e) {
            return this.Gl.forEach((function(t, n) {
                return e(n);
            })), Fn.resolve();
        }, t.prototype.ro = function(t) {
            return Fn.resolve(this.lastRemoteSnapshotVersion);
        }, t.prototype.oo = function(t) {
            return Fn.resolve(this.zl);
        }, t.prototype.no = function(t) {
            return this.highestTargetId = this.Yl.next(), Fn.resolve(this.highestTargetId);
        }, t.prototype.ho = function(t, e, n) {
            return n && (this.lastRemoteSnapshotVersion = n), e > this.zl && (this.zl = e), 
            Fn.resolve();
        }, t.prototype.uo = function(t) {
            this.Gl.set(t.target, t);
            var e = t.targetId;
            e > this.highestTargetId && (this.Yl = new ui(e), this.highestTargetId = e), t.sequenceNumber > this.zl && (this.zl = t.sequenceNumber);
        }, t.prototype.ao = function(t, e) {
            return this.uo(e), this.targetCount += 1, Fn.resolve();
        }, t.prototype.lo = function(t, e) {
            return this.uo(e), Fn.resolve();
        }, t.prototype._o = function(t, e) {
            return this.Gl.delete(e.target), this.Hl.Ch(e.targetId), this.targetCount -= 1, 
            Fn.resolve();
        }, t.prototype.hr = function(t, e, n) {
            var r = this, i = 0, o = [];
            return this.Gl.forEach((function(s, u) {
                u.sequenceNumber <= e && null === n.get(u.targetId) && (r.Gl.delete(s), o.push(r.fo(t, u.targetId)), 
                i++);
            })), Fn.Cn(o).next((function() {
                return i;
            }));
        }, t.prototype.do = function(t) {
            return Fn.resolve(this.targetCount);
        }, t.prototype.wo = function(t, e) {
            var n = this.Gl.get(e) || null;
            return Fn.resolve(n);
        }, t.prototype.To = function(t, e, n) {
            return this.Hl.vh(e, n), Fn.resolve();
        }, t.prototype.Io = function(t, e, n) {
            this.Hl.Dh(e, n);
            var r = this.persistence.dr, i = [];
            return r && e.forEach((function(e) {
                i.push(r.Dr(t, e));
            })), Fn.Cn(i);
        }, t.prototype.fo = function(t, e) {
            return this.Hl.Ch(e), Fn.resolve();
        }, t.prototype.Ao = function(t, e) {
            var n = this.Hl.Fh(e);
            return Fn.resolve(n);
        }, t.prototype.Nr = function(t, e) {
            return Fn.resolve(this.Hl.Nr(e));
        }, t;
    }(), Io = /** @class */ function() {
        /**
         * The constructor accepts a factory for creating a reference delegate. This
         * allows both the delegate and this instance to have strong references to
         * each other without having nullable fields that would then need to be
         * checked or asserted on every access.
         */
        function t(t) {
            var e = this;
            this.Jl = {}, this.yo = new Wn(0), this.po = !1, this.po = !0, this.dr = t(this), 
            this.ko = new _o(this), this.zn = new Fr, this.Kn = new bo(this.zn, (function(t) {
                return e.dr.Xl(t);
            }));
        }
        return t.prototype.start = function() {
            return Promise.resolve();
        }, t.prototype.th = function() {
            // No durable state to ensure is closed on shutdown.
            return this.po = !1, Promise.resolve();
        }, Object.defineProperty(t.prototype, "tr", {
            get: function() {
                return this.po;
            },
            enumerable: !1,
            configurable: !0
        }), t.prototype.Bo = function() {
            // No op.
        }, t.prototype.Uo = function() {
            // No op.
        }, t.prototype.uh = function() {
            return this.zn;
        }, t.prototype.oh = function(t) {
            var e = this.Jl[t.$h()];
            return e || (e = new wo(this.zn, this.dr), this.Jl[t.$h()] = e), e;
        }, t.prototype.hh = function() {
            return this.ko;
        }, t.prototype.ah = function() {
            return this.Kn;
        }, t.prototype.runTransaction = function(t, e, n) {
            var r = this;
            h("MemoryPersistence", "Starting transaction:", t);
            var i = new Eo(this.yo.next());
            return this.dr.Zl(), n(i).next((function(t) {
                return r.dr.t_(i).next((function() {
                    return t;
                }));
            })).Sn().then((function(t) {
                return i.jn(), t;
            }));
        }, t.prototype.e_ = function(t, e) {
            return Fn.Nn(Object.values(this.Jl).map((function(n) {
                return function() {
                    return n.Nr(t, e);
                };
            })));
        }, t;
    }(), Eo = /** @class */ function(e) {
        function n(t) {
            var n = this;
            return (n = e.call(this) || this).Ro = t, n;
        }
        return t.__extends(n, e), n;
    }(Bn), To = /** @class */ function() {
        function t(t) {
            this.persistence = t, 
            /** Tracks all documents that are active in Query views. */
            this.n_ = new ki, 
            /** The list of documents that are potentially GCed after each transaction. */
            this.s_ = null;
        }
        return t.i_ = function(e) {
            return new t(e);
        }, Object.defineProperty(t.prototype, "r_", {
            get: function() {
                if (this.s_) return this.s_;
                throw d();
            },
            enumerable: !1,
            configurable: !0
        }), t.prototype.Eo = function(t, e, n) {
            return this.n_.Eo(n, e), this.r_.delete(n.toString()), Fn.resolve();
        }, t.prototype.mo = function(t, e, n) {
            return this.n_.mo(n, e), this.r_.add(n.toString()), Fn.resolve();
        }, t.prototype.Dr = function(t, e) {
            return this.r_.add(e.toString()), Fn.resolve();
        }, t.prototype.removeTarget = function(t, e) {
            var n = this;
            this.n_.Ch(e.targetId).forEach((function(t) {
                return n.r_.add(t.toString());
            }));
            var r = this.persistence.hh();
            return r.Ao(t, e.targetId).next((function(t) {
                t.forEach((function(t) {
                    return n.r_.add(t.toString());
                }));
            })).next((function() {
                return r._o(t, e);
            }));
        }, t.prototype.Zl = function() {
            this.s_ = new Set;
        }, t.prototype.t_ = function(t) {
            var e = this, n = this.persistence.ah().jr();
            // Remove newly orphaned documents.
                    return Fn.forEach(this.r_, (function(r) {
                var i = U.B(r);
                return e.o_(t, i).next((function(t) {
                    t || n.Mn(i);
                }));
            })).next((function() {
                return e.s_ = null, n.apply(t);
            }));
        }, t.prototype.wh = function(t, e) {
            var n = this;
            return this.o_(t, e).next((function(t) {
                t ? n.r_.delete(e.toString()) : n.r_.add(e.toString());
            }));
        }, t.prototype.Xl = function(t) {
            // For eager GC, we don't care about the document size, there are no size thresholds.
            return 0;
        }, t.prototype.o_ = function(t, e) {
            var n = this;
            return Fn.Nn([ function() {
                return Fn.resolve(n.n_.Nr(e));
            }, function() {
                return n.persistence.hh().Nr(t, e);
            }, function() {
                return n.persistence.e_(t, e);
            } ]);
        }, t;
    }(), No = /** @class */ function() {
        function t(t) {
            this.h_ = t.h_, this.a_ = t.a_;
        }
        return t.prototype.wa = function(t) {
            this.u_ = t;
        }, t.prototype.ca = function(t) {
            this.c_ = t;
        }, t.prototype.onMessage = function(t) {
            this.l_ = t;
        }, t.prototype.close = function() {
            this.a_();
        }, t.prototype.send = function(t) {
            this.h_(t);
        }, t.prototype.__ = function() {
            this.u_();
        }, t.prototype.f_ = function(t) {
            this.c_(t);
        }, t.prototype.d_ = function(t) {
            this.l_(t);
        }, t;
    }(), Ao = {
        BatchGetDocuments: "batchGet",
        Commit: "commit",
        RunQuery: "runQuery"
    }, So = /** @class */ function(e) {
        function n(t) {
            var n = this;
            return (n = e.call(this, t) || this).forceLongPolling = t.forceLongPolling, n;
        }
        /**
         * Base class for all Rest-based connections to the backend (WebChannel and
         * HTTP).
         */
        return t.__extends(n, e), n.prototype.A_ = function(t, e, n, r) {
            return new Promise((function(o, s) {
                var u = new i.XhrIo;
                u.listenOnce(i.EventType.COMPLETE, (function() {
                    try {
                        switch (u.getLastErrorCode()) {
                          case i.ErrorCode.NO_ERROR:
                            var e = u.getResponseJson();
                            h("Connection", "XHR received:", JSON.stringify(e)), o(e);
                            break;

                          case i.ErrorCode.TIMEOUT:
                            h("Connection", 'RPC "' + t + '" timed out'), s(new x(D.DEADLINE_EXCEEDED, "Request time out"));
                            break;

                          case i.ErrorCode.HTTP_ERROR:
                            var n = u.getStatus();
                            if (h("Connection", 'RPC "' + t + '" failed with status:', n, "response text:", u.getResponseText()), 
                            n > 0) {
                                var r = u.getResponseJson().error;
                                if (r && r.status && r.message) {
                                    var a = function(t) {
                                        var e = t.toLowerCase().replace("_", "-");
                                        return Object.values(D).indexOf(e) >= 0 ? e : D.UNKNOWN;
                                    }(r.status);
                                    s(new x(a, r.message));
                                } else s(new x(D.UNKNOWN, "Server responded with status " + u.getStatus()));
                            } else 
                            // If we received an HTTP_ERROR but there's no status code,
                            // it's most probably a connection issue
                            s(new x(D.UNAVAILABLE, "Connection failed."));
                            break;

                          default:
                            d();
                        }
                    } finally {
                        h("Connection", 'RPC "' + t + '" completed.');
                    }
                }));
                var a = JSON.stringify(r);
                u.send(e, "POST", a, n, 15);
            }));
        }, n.prototype.Ta = function(t, e) {
            var n = [ this.T_, "/", "google.firestore.v1.Firestore", "/", t, "/channel" ], o = i.createWebChannelTransport(), s = {
                // Required for backend stickiness, routing behavior is based on this
                // parameter.
                httpSessionIdParam: "gsessionid",
                initMessageHeaders: {},
                messageUrlParams: {
                    // This param is used to improve routing and project isolation by the
                    // backend and must be included in every request.
                    database: "projects/" + this.s.projectId + "/databases/" + this.s.database
                },
                sendRawJson: !0,
                supportsCrossDomainXhr: !0,
                internalChannelParams: {
                    // Override the default timeout (randomized between 10-20 seconds) since
                    // a large write batch on a slow internet connection may take a long
                    // time to send to the backend. Rather than have WebChannel impose a
                    // tight timeout which could lead to infinite timeouts and retries, we
                    // set it very large (5-10 minutes) and rely on the browser's builtin
                    // timeouts to kick in if the request isn't working.
                    forwardChannelRequestTimeoutMs: 6e5
                },
                forceLongPolling: this.forceLongPolling
            };
            this.m_(s.initMessageHeaders, e), 
            // Sending the custom headers we just added to request.initMessageHeaders
            // (Authorization, etc.) will trigger the browser to make a CORS preflight
            // request because the XHR will no longer meet the criteria for a "simple"
            // CORS request:
            // https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#Simple_requests
            // Therefore to avoid the CORS preflight request (an extra network
            // roundtrip), we use the httpHeadersOverwriteParam option to specify that
            // the headers should instead be encoded into a special "$httpHeaders" query
            // parameter, which is recognized by the webchannel backend. This is
            // formally defined here:
            // https://github.com/google/closure-library/blob/b0e1815b13fb92a46d7c9b3c30de5d6a396a3245/closure/goog/net/rpc/httpcors.js#L32
            // TODO(b/145624756): There is a backend bug where $httpHeaders isn't respected if the request
            // doesn't have an Origin header. So we have to exclude a few browser environments that are
            // known to (sometimes) not include an Origin. See
            // https://github.com/firebase/firebase-js-sdk/issues/1491.
            r.isMobileCordova() || r.isReactNative() || r.isElectron() || r.isIE() || r.isUWP() || r.isBrowserExtension() || (s.httpHeadersOverwriteParam = "$httpHeaders");
            var u = n.join("");
            h("Connection", "Creating WebChannel: " + u, s);
            var a = o.createWebChannel(u, s), c = !1, f = !1, p = new No({
                h_: function(t) {
                    f ? h("Connection", "Not sending because WebChannel is closed:", t) : (c || (h("Connection", "Opening WebChannel transport."), 
                    a.open(), c = !0), h("Connection", "WebChannel sending:", t), a.send(t));
                },
                a_: function() {
                    return a.close();
                }
            }), d = function(t, e) {
                // TODO(dimond): closure typing seems broken because WebChannel does
                // not implement goog.events.Listenable
                a.listen(t, (function(t) {
                    try {
                        e(t);
                    } catch (t) {
                        setTimeout((function() {
                            throw t;
                        }), 0);
                    }
                }));
            };
            // WebChannel supports sending the first message with the handshake - saving
            // a network round trip. However, it will have to call send in the same
            // JS event loop as open. In order to enforce this, we delay actually
            // opening the WebChannel until send is called. Whether we have called
            // open is tracked with this variable.
                    // Closure events are guarded and exceptions are swallowed, so catch any
            // exception and rethrow using a setTimeout so they become visible again.
            // Note that eventually this function could go away if we are confident
            // enough the code is exception free.
            return d(i.WebChannel.EventType.OPEN, (function() {
                f || h("Connection", "WebChannel transport opened.");
            })), d(i.WebChannel.EventType.CLOSE, (function() {
                f || (f = !0, h("Connection", "WebChannel transport closed"), p.f_());
            })), d(i.WebChannel.EventType.ERROR, (function(t) {
                f || (f = !0, l("Connection", "WebChannel transport errored:", t), p.f_(new x(D.UNAVAILABLE, "The operation could not be completed")));
            })), d(i.WebChannel.EventType.MESSAGE, (function(t) {
                var e;
                if (!f) {
                    var n = t.data[0];
                    y(!!n);
                    // TODO(b/35143891): There is a bug in One Platform that caused errors
                    // (and only errors) to be wrapped in an extra array. To be forward
                    // compatible with the bug we need to check either condition. The latter
                    // can be removed once the fix has been rolled out.
                    // Use any because msgData.error is not typed.
                    var r = n, i = r.error || (null === (e = r[0]) || void 0 === e ? void 0 : e.error);
                    if (i) {
                        h("Connection", "WebChannel received error:", i);
                        // error.status will be a string like 'OK' or 'NOT_FOUND'.
                        var o = i.status, s = function(t) {
                            // lookup by string
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            var e = W[t];
                            if (void 0 !== e) return X(e);
                        }(o), u = i.message;
                        void 0 === s && (s = D.INTERNAL, u = "Unknown error status: " + o + " with message " + i.message), 
                        // Mark closed so no further events are propagated
                        f = !0, p.f_(new x(s, u)), a.close();
                    } else h("Connection", "WebChannel received:", n), p.d_(n);
                }
            })), setTimeout((function() {
                // Technically we could/should wait for the WebChannel opened event,
                // but because we want to send the first message with the WebChannel
                // handshake we pretend the channel opened here (asynchronously), and
                // then delay the actual open until the first message is sent.
                p.__();
            }), 0), p;
        }, n;
    }(/** @class */ function() {
        function t(t) {
            this.w_ = t, this.s = t.s;
            var e = t.ssl ? "https" : "http";
            this.T_ = e + "://" + t.host, this.E_ = "projects/" + this.s.projectId + "/databases/" + this.s.database + "/documents";
        }
        return t.prototype.va = function(t, e, n, r) {
            var i = this.I_(t, e);
            h("RestConnection", "Sending: ", i, n);
            var o = {};
            return this.m_(o, r), this.A_(t, i, o, n).then((function(t) {
                return h("RestConnection", "Received: ", t), t;
            }), (function(e) {
                throw l("RestConnection", t + " failed with error: ", e, "url: ", i, "request:", n), 
                e;
            }));
        }, t.prototype.Sa = function(t, e, n, r) {
            // The REST API automatically aggregates all of the streamed results, so we
            // can just use the normal invoke() method.
            return this.va(t, e, n, r);
        }, 
        /**
         * Modifies the headers for a request, adding any authorization token if
         * present and any additional headers for the request.
         */
        t.prototype.m_ = function(t, e) {
            if (t["X-Goog-Api-Client"] = "gl-js/ fire/7.19.1", 
            // Content-Type: text/plain will avoid preflight requests which might
            // mess with CORS and redirects by proxies. If we add custom headers
            // we will need to change this code to potentially use the $httpOverwrite
            // parameter supported by ESF to avoid	triggering preflight requests.
            t["Content-Type"] = "text/plain", e) for (var n in e.Mh) e.Mh.hasOwnProperty(n) && (t[n] = e.Mh[n]);
        }, t.prototype.I_ = function(t, e) {
            var n = Ao[t];
            return this.T_ + "/v1/" + e + ":" + n;
        }, t;
    }()), Do = /** @class */ function() {
        function t() {
            var t = this;
            this.R_ = function() {
                return t.P_();
            }, this.g_ = function() {
                return t.V_();
            }, this.y_ = [], this.p_();
        }
        return t.prototype.Ka = function(t) {
            this.y_.push(t);
        }, t.prototype.th = function() {
            window.removeEventListener("online", this.R_), window.removeEventListener("offline", this.g_);
        }, t.prototype.p_ = function() {
            window.addEventListener("online", this.R_), window.addEventListener("offline", this.g_);
        }, t.prototype.P_ = function() {
            h("ConnectivityMonitor", "Network connectivity changed: AVAILABLE");
            for (var t = 0, e = this.y_; t < e.length; t++) {
                (0, e[t])(0 /* AVAILABLE */);
            }
        }, t.prototype.V_ = function() {
            h("ConnectivityMonitor", "Network connectivity changed: UNAVAILABLE");
            for (var t = 0, e = this.y_; t < e.length; t++) {
                (0, e[t])(1 /* UNAVAILABLE */);
            }
        }, 
        // TODO(chenbrian): Consider passing in window either into this component or
        // here for testing via FakeWindow.
        /** Checks that all used attributes of window are available. */
        t.ks = function() {
            return "undefined" != typeof window && void 0 !== window.addEventListener && void 0 !== window.removeEventListener;
        }, t;
    }(), xo = /** @class */ function() {
        function t() {}
        return t.prototype.Ka = function(t) {
            // No-op.
        }, t.prototype.th = function() {
            // No-op.
        }, t;
    }();

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A memory-backed instance of Persistence. Data is stored only in RAM and
     * not persisted across sessions.
     */
    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /** Initializes the WebChannelConnection for the browser. */
    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function ko(t) {
        return new Qt(t, /* useProto3Json= */ !0);
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */ var Lo = "You are using the memory-only build of Firestore. Persistence support is only available via the @firebase/firestore bundle or the firebase-firestore.js build.", Ro = /** @class */ function() {
        function e() {}
        return e.prototype.initialize = function(e) {
            return t.__awaiter(this, void 0, void 0, (function() {
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        return this.Uc = this.b_(e), this.persistence = this.v_(e), [ 4 /*yield*/ , this.persistence.start() ];

                      case 1:
                        return t.sent(), this.S_ = this.D_(e), this.La = this.C_(e), [ 2 /*return*/ ];
                    }
                }));
            }));
        }, e.prototype.D_ = function(t) {
            return null;
        }, e.prototype.C_ = function(t) {
            /** Manages our in-memory or durable persistence. */
            return e = this.persistence, n = new mo, r = t.N_, new bi(e, n, r);
            var e, n, r;
        }, e.prototype.v_ = function(t) {
            if (t.k_.F_) throw new x(D.FAILED_PRECONDITION, Lo);
            return new Io(To.i_);
        }, e.prototype.b_ = function(t) {
            return new Ji;
        }, e.prototype.terminate = function() {
            return t.__awaiter(this, void 0, void 0, (function() {
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        return this.S_ && this.S_.stop(), [ 4 /*yield*/ , this.Uc.th() ];

                      case 1:
                        return t.sent(), [ 4 /*yield*/ , this.persistence.th() ];

                      case 2:
                        return t.sent(), [ 2 /*return*/ ];
                    }
                }));
            }));
        }, e.prototype.clearPersistence = function(t, e) {
            throw new x(D.FAILED_PRECONDITION, Lo);
        }, e;
    }(), Po = /** @class */ function(e) {
        function n(t) {
            var n = this;
            return (n = e.call(this) || this).x_ = t, n;
        }
        return t.__extends(n, e), n.prototype.initialize = function(n) {
            return t.__awaiter(this, void 0, void 0, (function() {
                var r, i = this;
                return t.__generator(this, (function(o) {
                    switch (o.label) {
                      case 0:
                        return [ 4 /*yield*/ , e.prototype.initialize.call(this, n) ];

                      case 1:
                        return o.sent(), [ 4 /*yield*/ , this.x_.initialize(this, n) ];

                      case 2:
                        return o.sent(), r = this.x_.fu, this.Uc instanceof $i ? (this.Uc.fu = {
                            Ic: uo.bind(null, r),
                            mc: lo.bind(null, r),
                            Ac: po.bind(null, r),
                            rh: fo.bind(null, r)
                        }, [ 4 /*yield*/ , this.Uc.start() ]) : [ 3 /*break*/ , 4 ];

                      case 3:
                        o.sent(), o.label = 4;

                      case 4:
                        // NOTE: This will immediately call the listener, so we make sure to
                        // set it after localStore / remoteStore are started.
                        return [ 4 /*yield*/ , this.persistence.qo((function(e) {
                            return t.__awaiter(i, void 0, void 0, (function() {
                                return t.__generator(this, (function(t) {
                                    switch (t.label) {
                                      case 0:
                                        return [ 4 /*yield*/ , ao(this.x_.fu, e) ];

                                      case 1:
                                        return t.sent(), this.S_ && (e && !this.S_.tr ? this.S_.start(this.La) : e || this.S_.stop()), 
                                        [ 2 /*return*/ ];
                                    }
                                }));
                            }));
                        })) ];

                      case 5:
                        // NOTE: This will immediately call the listener, so we make sure to
                        // set it after localStore / remoteStore are started.
                        return o.sent(), [ 2 /*return*/ ];
                    }
                }));
            }));
        }, n.prototype.b_ = function(t) {
            if (t.k_.F_ && t.k_.synchronizeTabs) {
                var e = ir();
                if (!$i.ks(e)) throw new x(D.UNIMPLEMENTED, "IndexedDB persistence is only available on platforms that support LocalStorage.");
                var n = wi(t.w_.s, t.w_.persistenceKey);
                return new $i(e, t.ei, n, t.clientId, t.N_);
            }
            return new Ji;
        }, n;
    }(/** @class */ function(e) {
        function n() {
            return null !== e && e.apply(this, arguments) || this;
        }
        return t.__extends(n, e), n.prototype.initialize = function(n) {
            return t.__awaiter(this, void 0, void 0, (function() {
                return t.__generator(this, (function(r) {
                    switch (r.label) {
                      case 0:
                        return [ 4 /*yield*/ , e.prototype.initialize.call(this, n) ];

                      case 1:
                        return r.sent(), [ 4 /*yield*/ , function(e) {
                            return t.__awaiter(this, void 0, void 0, (function() {
                                var n, r;
                                return t.__generator(this, (function(t) {
                                    return n = v(e), r = v(n.Ah), [ 2 /*return*/ , n.persistence.runTransaction("Synchronize last document change read time", "readonly", (function(t) {
                                        return r.Wr(t);
                                    })).then((function(t) {
                                        n.mh = t;
                                    })) ];
                                }));
                            }));
                        }(this.La) ];

                      case 2:
                        return r.sent(), [ 2 /*return*/ ];
                    }
                }));
            }));
        }, n.prototype.D_ = function(t) {
            var e = this.persistence.dr.Yi;
            return new pr(e, t.ei);
        }, n.prototype.v_ = function(t) {
            var e = wi(t.w_.s, t.w_.persistenceKey), n = ko(t.w_.s);
            return new di(t.k_.synchronizeTabs, e, t.clientId, lr.Ui(t.k_.cacheSizeBytes), t.ei, ir(), or(), n, this.Uc, t.k_.Vo);
        }, n.prototype.b_ = function(t) {
            return new Ji;
        }, n.prototype.clearPersistence = function(e, n) {
            return function(e) {
                return t.__awaiter(this, void 0, void 0, (function() {
                    var n;
                    return t.__generator(this, (function(t) {
                        switch (t.label) {
                          case 0:
                            return Yn.ks() ? (n = e + "main", [ 4 /*yield*/ , Yn.delete(n) ]) : [ 2 /*return*/ , Promise.resolve() ];

                          case 1:
                            return t.sent(), [ 2 /*return*/ ];
                        }
                    }));
                }));
            }(wi(e, n));
        }, n;
    }(Ro)), Oo = /** @class */ function() {
        function e() {}
        return e.prototype.initialize = function(e, n) {
            return t.__awaiter(this, void 0, void 0, (function() {
                var r = this;
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        return this.La ? [ 3 /*break*/ , 3 ] : (this.La = e.La, this.Uc = e.Uc, this.qa = this.O_(n), 
                        this.Bc = this.M_(n), this.fu = this.L_(n), this.q_ = this.B_(n), this.Uc.Da = function(t) {
                            return r.fu.xc(t, 1 /* SharedClientState */);
                        }, this.Bc.fu = this.fu, [ 4 /*yield*/ , this.Bc.start() ]);

                      case 1:
                        return t.sent(), [ 4 /*yield*/ , this.Bc.Su(this.fu.el) ];

                      case 2:
                        t.sent(), t.label = 3;

                      case 3:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        }, e.prototype.B_ = function(t) {
            return new vo(this.fu);
        }, e.prototype.O_ = function(t) {
            var e, n = ko(t.w_.s), r = (e = t.w_, new So(e));
            /** Return the Platform-specific connectivity monitor. */ return function(t, e, n) {
                return new Gi(t, e, n);
            }(t.credentials, r, n);
        }, e.prototype.M_ = function(t) {
            var e = this;
            return new Bi(this.La, this.qa, t.ei, (function(t) {
                return e.fu.xc(t, 0 /* RemoteStore */);
            }), Do.ks() ? new Do : new xo);
        }, e.prototype.L_ = function(t) {
            return function(t, e, n, 
            // PORTING NOTE: Manages state synchronization in multi-tab environments.
            r, i, o, s) {
                var u = new oo(t, e, n, r, i, o);
                return s && (u.tl = !0), u;
            }(this.La, this.Bc, this.qa, this.Uc, t.N_, t.Qc, !t.k_.F_ || !t.k_.synchronizeTabs);
        }, e.prototype.terminate = function() {
            return this.Bc.th();
        }, e;
    }();

    /**
     * Provides all components needed for Firestore with in-memory persistence.
     * Uses EagerGC garbage collection.
     */
    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function Vo(t) {
        /**
     * Returns true if obj is an object and contains at least one of the specified
     * methods.
     */
        return function(t, e) {
            if ("object" != typeof t || null === t) return !1;
            for (var n = t, r = 0, i = [ "next", "error", "complete" ]; r < i.length; r++) {
                var o = i[r];
                if (o in n && "function" == typeof n[o]) return !0;
            }
            return !1;
        }(t);
    }

    var Uo = /** @class */ function() {
        function t(t) {
            this.observer = t, 
            /**
                 * When set to true, will not raise future events. Necessary to deal with
                 * async detachment of listener.
                 */
            this.muted = !1;
        }
        return t.prototype.next = function(t) {
            this.observer.next && this.U_(this.observer.next, t);
        }, t.prototype.error = function(t) {
            this.observer.error ? this.U_(this.observer.error, t) : console.error("Uncaught Error in snapshot listener:", t);
        }, t.prototype.Q_ = function() {
            this.muted = !0;
        }, t.prototype.U_ = function(t, e) {
            var n = this;
            this.muted || setTimeout((function() {
                n.muted || t(e);
            }), 0);
        }, t;
    }();

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Validates that no arguments were passed in the invocation of functionName.
     *
     * Forward the magic "arguments" variable as second parameter on which the
     * parameter validation is performed:
     * validateNoArgs('myFunction', arguments);
     */ function Co(t, e) {
        if (0 !== e.length) throw new x(D.INVALID_ARGUMENT, "Function " + t + "() does not support arguments, but was called with " + es(e.length, "argument") + ".");
    }

    /**
     * Validates the invocation of functionName has the exact number of arguments.
     *
     * Forward the magic "arguments" variable as second parameter on which the
     * parameter validation is performed:
     * validateExactNumberOfArgs('myFunction', arguments, 2);
     */ function qo(t, e, n) {
        if (e.length !== n) throw new x(D.INVALID_ARGUMENT, "Function " + t + "() requires " + es(n, "argument") + ", but was called with " + es(e.length, "argument") + ".");
    }

    /**
     * Validates the invocation of functionName has at least the provided number of
     * arguments (but can have many more).
     *
     * Forward the magic "arguments" variable as second parameter on which the
     * parameter validation is performed:
     * validateAtLeastNumberOfArgs('myFunction', arguments, 2);
     */ function Mo(t, e, n) {
        if (e.length < n) throw new x(D.INVALID_ARGUMENT, "Function " + t + "() requires at least " + es(n, "argument") + ", but was called with " + es(e.length, "argument") + ".");
    }

    /**
     * Validates the invocation of functionName has number of arguments between
     * the values provided.
     *
     * Forward the magic "arguments" variable as second parameter on which the
     * parameter validation is performed:
     * validateBetweenNumberOfArgs('myFunction', arguments, 2, 3);
     */ function Fo(t, e, n, r) {
        if (e.length < n || e.length > r) throw new x(D.INVALID_ARGUMENT, "Function " + t + "() requires between " + n + " and " + r + " arguments, but was called with " + es(e.length, "argument") + ".");
    }

    /**
     * Validates the provided argument is an array and has as least the expected
     * number of elements.
     */
    /**
     * Validates the provided positional argument has the native JavaScript type
     * using typeof checks.
     */ function Go(t, e, n, r) {
        Ho(t, e, ts(n) + " argument", r);
    }

    /**
     * Validates the provided argument has the native JavaScript type using
     * typeof checks or is undefined.
     */ function jo(t, e, n, r) {
        void 0 !== r && Go(t, e, n, r);
    }

    /**
     * Validates the provided named option has the native JavaScript type using
     * typeof checks.
     */ function Bo(t, e, n, r) {
        Ho(t, e, n + " option", r);
    }

    /**
     * Validates the provided named option has the native JavaScript type using
     * typeof checks or is undefined.
     */ function zo(t, e, n, r) {
        void 0 !== r && Bo(t, e, n, r);
    }

    /**
     * Validates that the provided named option equals one of the expected values.
     */
    /**
     * Validates that the provided named option equals one of the expected values or
     * is undefined.
     */
    function Qo(t, e, n, r, i) {
        void 0 !== r && function(t, e, n, r, i) {
            for (var o = [], s = 0, u = i; s < u.length; s++) {
                var a = u[s];
                if (a === r) return;
                o.push(Yo(a));
            }
            var c = Yo(r);
            throw new x(D.INVALID_ARGUMENT, "Invalid value " + c + " provided to function " + t + '() for option "' + n + '". Acceptable values: ' + o.join(", "));
        }(t, 0, n, r, i);
    }

    /**
     * Validates that the provided argument is a valid enum.
     *
     * @param functionName Function making the validation call.
     * @param enums Array containing all possible values for the enum.
     * @param position Position of the argument in `functionName`.
     * @param argument Argument to validate.
     * @return The value as T if the argument can be converted.
     */ function Wo(t, e, n, r) {
        if (!e.some((function(t) {
            return t === r;
        }))) throw new x(D.INVALID_ARGUMENT, "Invalid value " + Yo(r) + " provided to function " + t + "() for its " + ts(n) + " argument. Acceptable values: " + e.join(", "));
        return r;
    }

    /** Helper to validate the type of a provided input. */ function Ho(t, e, n, r) {
        if (!("object" === e ? Ko(r) : "non-empty string" === e ? "string" == typeof r && "" !== r : typeof r === e)) {
            var i = Yo(r);
            throw new x(D.INVALID_ARGUMENT, "Function " + t + "() requires its " + n + " to be of type " + e + ", but it was: " + i);
        }
    }

    /**
     * Returns true if it's a non-null object without a custom prototype
     * (i.e. excludes Array, Date, etc.).
     */ function Ko(t) {
        return "object" == typeof t && null !== t && (Object.getPrototypeOf(t) === Object.prototype || null === Object.getPrototypeOf(t));
    }

    /** Returns a string describing the type / value of the provided input. */ function Yo(t) {
        if (void 0 === t) return "undefined";
        if (null === t) return "null";
        if ("string" == typeof t) return t.length > 20 && (t = t.substring(0, 20) + "..."), 
        JSON.stringify(t);
        if ("number" == typeof t || "boolean" == typeof t) return "" + t;
        if ("object" == typeof t) {
            if (t instanceof Array) return "an array";
            var e = 
            /** Hacky method to try to get the constructor name for an object. */
            function(t) {
                if (t.constructor) {
                    var e = /function\s+([^\s(]+)\s*\(/.exec(t.constructor.toString());
                    if (e && e.length > 1) return e[1];
                }
                return null;
            }(t);
            return e ? "a custom " + e + " object" : "an object";
        }
        return "function" == typeof t ? "a function" : d();
    }

    function Zo(t, e, n) {
        if (void 0 === n) throw new x(D.INVALID_ARGUMENT, "Function " + t + "() requires a valid " + ts(e) + " argument, but it was undefined.");
    }

    /**
     * Validates the provided positional argument is an object, and its keys and
     * values match the expected keys and types provided in optionTypes.
     */ function Xo(t, e, n) {
        N(e, (function(e, r) {
            if (n.indexOf(e) < 0) throw new x(D.INVALID_ARGUMENT, "Unknown option '" + e + "' passed to function " + t + "(). Available options: " + n.join(", "));
        }));
    }

    /**
     * Helper method to throw an error that the provided argument did not pass
     * an instanceof check.
     */ function $o(t, e, n, r) {
        var i = Yo(r);
        return new x(D.INVALID_ARGUMENT, "Function " + t + "() requires its " + ts(n) + " argument to be a " + e + ", but it was: " + i);
    }

    function Jo(t, e, n) {
        if (n <= 0) throw new x(D.INVALID_ARGUMENT, "Function " + t + "() requires its " + ts(e) + " argument to be a positive number, but it was: " + n + ".");
    }

    /** Converts a number to its english word representation */ function ts(t) {
        switch (t) {
          case 1:
            return "first";

          case 2:
            return "second";

          case 3:
            return "third";

          default:
            return t + "th";
        }
    }

    /**
     * Formats the given word as plural conditionally given the preceding number.
     */ function es(t, e) {
        return t + " " + e + (1 === t ? "" : "s");
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /** Helper function to assert Uint8Array is available at runtime. */ function ns() {
        if ("undefined" == typeof Uint8Array) throw new x(D.UNIMPLEMENTED, "Uint8Arrays are not available in this environment.");
    }

    /** Helper function to assert Base64 functions are available at runtime. */ function rs() {
        if ("undefined" == typeof atob) throw new x(D.UNIMPLEMENTED, "Blobs are unavailable in Firestore in this environment.");
    }

    /**
     * Immutable class holding a blob (binary data).
     * This class is directly exposed in the public API.
     *
     * Note that while you can't hide the constructor in JavaScript code, we are
     * using the hack above to make sure no-one outside this module can call it.
     */ var is = /** @class */ function() {
        function t(t) {
            rs(), this.W_ = t;
        }
        return t.fromBase64String = function(e) {
            qo("Blob.fromBase64String", arguments, 1), Go("Blob.fromBase64String", "string", 1, e), 
            rs();
            try {
                return new t(Q.fromBase64String(e));
            } catch (e) {
                throw new x(D.INVALID_ARGUMENT, "Failed to construct Blob from Base64 string: " + e);
            }
        }, t.fromUint8Array = function(e) {
            if (qo("Blob.fromUint8Array", arguments, 1), ns(), !(e instanceof Uint8Array)) throw $o("Blob.fromUint8Array", "Uint8Array", 1, e);
            return new t(Q.fromUint8Array(e));
        }, t.prototype.toBase64 = function() {
            return qo("Blob.toBase64", arguments, 0), rs(), this.W_.toBase64();
        }, t.prototype.toUint8Array = function() {
            return qo("Blob.toUint8Array", arguments, 0), ns(), this.W_.toUint8Array();
        }, t.prototype.toString = function() {
            return "Blob(base64: " + this.toBase64() + ")";
        }, t.prototype.isEqual = function(t) {
            return this.W_.isEqual(t.W_);
        }, t;
    }(), os = function(t) {
        !function(t, e, n, r) {
            if (!(e instanceof Array) || e.length < 1) throw new x(D.INVALID_ARGUMENT, "Function FieldPath() requires its fieldNames argument to be an array with at least " + es(1, "element") + ".");
        }(0, t);
        for (var e = 0; e < t.length; ++e) if (Go("FieldPath", "string", e, t[e]), 0 === t[e].length) throw new x(D.INVALID_ARGUMENT, "Invalid field name at argument $(i + 1). Field names must not be empty.");
        this.j_ = new V(t);
    }, ss = /** @class */ function(e) {
        /**
         * Creates a FieldPath from the provided field names. If more than one field
         * name is provided, the path will point to a nested field in a document.
         *
         * @param fieldNames A list of field names.
         */
        function n() {
            for (var t = [], n = 0; n < arguments.length; n++) t[n] = arguments[n];
            return e.call(this, t) || this;
        }
        return t.__extends(n, e), n.documentId = function() {
            /**
             * Internal Note: The backend doesn't technically support querying by
             * document ID. Instead it queries by the entire document name (full path
             * included), but in the cases we currently support documentId(), the net
             * effect is the same.
             */
            return new n(V.L().F());
        }, n.prototype.isEqual = function(t) {
            if (!(t instanceof n)) throw $o("isEqual", "FieldPath", 1, t);
            return this.j_.isEqual(t.j_);
        }, n;
    }(os), us = new RegExp("[~\\*/\\[\\]]"), as = function() {
        /** A pointer to the implementing class. */
        this.K_ = this;
    }, cs = /** @class */ function(e) {
        function n(t) {
            var n = this;
            return (n = e.call(this) || this).G_ = t, n;
        }
        return t.__extends(n, e), n.prototype.z_ = function(t) {
            if (2 /* MergeSet */ !== t.H_) throw 1 /* Update */ === t.H_ ? t.Y_(this.G_ + "() can only appear at the top level of your update data") : t.Y_(this.G_ + "() cannot be used with set() unless you pass {merge:true}");
            // No transform to add for a delete, but we need to add it to our
            // fieldMask so it gets deleted.
                    return t.qe.push(t.path), null;
        }, n.prototype.isEqual = function(t) {
            return t instanceof n;
        }, n;
    }(as);

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // The objects that are a part of this API are exposed to third-parties as
    // compiled javascript so we want to flag our private members with a leading
    // underscore to discourage their use.
    /**
     * A field class base class that is shared by the lite, full and legacy SDK,
     * which supports shared code that deals with FieldPaths.
     */
    /**
     * Creates a child context for parsing SerializableFieldValues.
     *
     * This is different than calling `ParseContext.contextWith` because it keeps
     * the fieldTransforms and fieldMask separate.
     *
     * The created context has its `dataSource` set to `UserDataSource.Argument`.
     * Although these values are used with writes, any elements in these FieldValues
     * are not considered writes since they cannot contain any FieldValue sentinels,
     * etc.
     *
     * @param fieldValue The sentinel FieldValue for which to create a child
     *     context.
     * @param context The parent context.
     * @param arrayElement Whether or not the FieldValue has an array.
     */
    function hs(t, e, n) {
        return new Es({
            H_: 3 /* Argument */ ,
            J_: e.settings.J_,
            methodName: t.G_,
            X_: n
        }, e.s, e.serializer, e.ignoreUndefinedProperties);
    }

    var fs = /** @class */ function(e) {
        function n(t) {
            var n = this;
            return (n = e.call(this) || this).G_ = t, n;
        }
        return t.__extends(n, e), n.prototype.z_ = function(t) {
            return new Ve(t.path, new Ae);
        }, n.prototype.isEqual = function(t) {
            return t instanceof n;
        }, n;
    }(as), ls = /** @class */ function(e) {
        function n(t, n) {
            var r = this;
            return (r = e.call(this) || this).G_ = t, r.Z_ = n, r;
        }
        return t.__extends(n, e), n.prototype.z_ = function(t) {
            var e = hs(this, t, 
            /*array=*/ !0), n = this.Z_.map((function(t) {
                return xs(t, e);
            })), r = new Se(n);
            return new Ve(t.path, r);
        }, n.prototype.isEqual = function(t) {
            // TODO(mrschmidt): Implement isEquals
            return this === t;
        }, n;
    }(as), ps = /** @class */ function(e) {
        function n(t, n) {
            var r = this;
            return (r = e.call(this) || this).G_ = t, r.Z_ = n, r;
        }
        return t.__extends(n, e), n.prototype.z_ = function(t) {
            var e = hs(this, t, 
            /*array=*/ !0), n = this.Z_.map((function(t) {
                return xs(t, e);
            })), r = new xe(n);
            return new Ve(t.path, r);
        }, n.prototype.isEqual = function(t) {
            // TODO(mrschmidt): Implement isEquals
            return this === t;
        }, n;
    }(as), ds = /** @class */ function(e) {
        function n(t, n) {
            var r = this;
            return (r = e.call(this) || this).G_ = t, r.tf = n, r;
        }
        return t.__extends(n, e), n.prototype.z_ = function(t) {
            var e = new Le(t.serializer, Kt(t.serializer, this.tf));
            return new Ve(t.path, e);
        }, n.prototype.isEqual = function(t) {
            // TODO(mrschmidt): Implement isEquals
            return this === t;
        }, n;
    }(as), ys = /** @class */ function(e) {
        function n() {
            return e.call(this) || this;
        }
        return t.__extends(n, e), n.delete = function() {
            return Co("FieldValue.delete", arguments), new vs(new cs("FieldValue.delete"));
        }, n.serverTimestamp = function() {
            return Co("FieldValue.serverTimestamp", arguments), new vs(new fs("FieldValue.serverTimestamp"));
        }, n.arrayUnion = function() {
            for (var t = [], e = 0; e < arguments.length; e++) t[e] = arguments[e];
            // NOTE: We don't actually parse the data until it's used in set() or
            // update() since we'd need the Firestore instance to do this.
                    return Mo("FieldValue.arrayUnion", arguments, 1), new vs(new ls("FieldValue.arrayUnion", t));
        }, n.arrayRemove = function() {
            for (var t = [], e = 0; e < arguments.length; e++) t[e] = arguments[e];
            // NOTE: We don't actually parse the data until it's used in set() or
            // update() since we'd need the Firestore instance to do this.
                    return Mo("FieldValue.arrayRemove", arguments, 1), new vs(new ps("FieldValue.arrayRemove", t));
        }, n.increment = function(t) {
            return Go("FieldValue.increment", "number", 1, t), qo("FieldValue.increment", arguments, 1), 
            new vs(new ds("FieldValue.increment", t));
        }, n;
    }(as), vs = /** @class */ function(e) {
        function n(t) {
            var n = this;
            return (n = e.call(this) || this).K_ = t, n.G_ = t.G_, n;
        }
        return t.__extends(n, e), n.prototype.z_ = function(t) {
            return this.K_.z_(t);
        }, n.prototype.isEqual = function(t) {
            return t instanceof n && this.K_.isEqual(t.K_);
        }, n;
    }(ys), gs = /** @class */ function() {
        function t(t, e) {
            if (qo("GeoPoint", arguments, 2), Go("GeoPoint", "number", 1, t), Go("GeoPoint", "number", 2, e), 
            !isFinite(t) || t < -90 || t > 90) throw new x(D.INVALID_ARGUMENT, "Latitude must be a number between -90 and 90, but was: " + t);
            if (!isFinite(e) || e < -180 || e > 180) throw new x(D.INVALID_ARGUMENT, "Longitude must be a number between -180 and 180, but was: " + e);
            this.ef = t, this.nf = e;
        }
        return Object.defineProperty(t.prototype, "latitude", {
            /**
             * Returns the latitude of this geo point, a number between -90 and 90.
             */
            get: function() {
                return this.ef;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "longitude", {
            /**
             * Returns the longitude of this geo point, a number between -180 and 180.
             */
            get: function() {
                return this.nf;
            },
            enumerable: !1,
            configurable: !0
        }), t.prototype.isEqual = function(t) {
            return this.ef === t.ef && this.nf === t.nf;
        }, t.prototype.toJSON = function() {
            return {
                latitude: this.ef,
                longitude: this.nf
            };
        }, 
        /**
         * Actually private to JS consumers of our API, so this function is prefixed
         * with an underscore.
         */
        t.prototype.T = function(t) {
            return w(this.ef, t.ef) || w(this.nf, t.nf);
        }, t;
    }(), ms = /^__.*__$/, ws = function(t, e, n) {
        this.sf = t, this.if = e, this.rf = n;
    }, bs = /** @class */ function() {
        function t(t, e, n) {
            this.data = t, this.qe = e, this.fieldTransforms = n;
        }
        return t.prototype.hf = function(t, e) {
            var n = [];
            return null !== this.qe ? n.push(new We(t, this.data, this.qe, e)) : n.push(new Qe(t, this.data, e)), 
            this.fieldTransforms.length > 0 && n.push(new Ke(t, this.fieldTransforms)), n;
        }, t;
    }(), _s = /** @class */ function() {
        function t(t, e, n) {
            this.data = t, this.qe = e, this.fieldTransforms = n;
        }
        return t.prototype.hf = function(t, e) {
            var n = [ new We(t, this.data, this.qe, e) ];
            return this.fieldTransforms.length > 0 && n.push(new Ke(t, this.fieldTransforms)), 
            n;
        }, t;
    }();

    function Is(t) {
        switch (t) {
          case 0 /* Set */ :
     // fall through
                  case 2 /* MergeSet */ :
     // fall through
                  case 1 /* Update */ :
            return !0;

          case 3 /* Argument */ :
          case 4 /* ArrayArgument */ :
            return !1;

          default:
            throw d();
        }
    }

    /** A "context" object passed around while parsing user data. */ var Es = /** @class */ function() {
        /**
         * Initializes a ParseContext with the given source and path.
         *
         * @param settings The settings for the parser.
         * @param databaseId The database ID of the Firestore instance.
         * @param serializer The serializer to use to generate the Value proto.
         * @param ignoreUndefinedProperties Whether to ignore undefined properties
         * rather than throw.
         * @param fieldTransforms A mutable list of field transforms encountered while
         *     parsing the data.
         * @param fieldMask A mutable list of field paths encountered while parsing
         *     the data.
         *
         * TODO(b/34871131): We don't support array paths right now, so path can be
         * null to indicate the context represents any location within an array (in
         * which case certain features will not work and errors will be somewhat
         * compromised).
         */
        function t(t, e, n, r, i, o) {
            this.settings = t, this.s = e, this.serializer = n, this.ignoreUndefinedProperties = r, 
            // Minor hack: If fieldTransforms is undefined, we assume this is an
            // external call and we need to validate the entire path.
            void 0 === i && this.af(), this.fieldTransforms = i || [], this.qe = o || [];
        }
        return Object.defineProperty(t.prototype, "path", {
            get: function() {
                return this.settings.path;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "H_", {
            get: function() {
                return this.settings.H_;
            },
            enumerable: !1,
            configurable: !0
        }), 
        /** Returns a new context with the specified settings overwritten. */ t.prototype.uf = function(e) {
            return new t(Object.assign(Object.assign({}, this.settings), e), this.s, this.serializer, this.ignoreUndefinedProperties, this.fieldTransforms, this.qe);
        }, t.prototype.cf = function(t) {
            var e, n = null === (e = this.path) || void 0 === e ? void 0 : e.child(t), r = this.uf({
                path: n,
                X_: !1
            });
            return r.lf(t), r;
        }, t.prototype._f = function(t) {
            var e, n = null === (e = this.path) || void 0 === e ? void 0 : e.child(t), r = this.uf({
                path: n,
                X_: !1
            });
            return r.af(), r;
        }, t.prototype.ff = function(t) {
            // TODO(b/34871131): We don't support array paths right now; so make path
            // undefined.
            return this.uf({
                path: void 0,
                X_: !0
            });
        }, t.prototype.Y_ = function(t) {
            return Vs(t, this.settings.methodName, this.settings.df || !1, this.path, this.settings.J_);
        }, 
        /** Returns 'true' if 'fieldPath' was traversed when creating this context. */ t.prototype.contains = function(t) {
            return void 0 !== this.qe.find((function(e) {
                return t.D(e);
            })) || void 0 !== this.fieldTransforms.find((function(e) {
                return t.D(e.field);
            }));
        }, t.prototype.af = function() {
            // TODO(b/34871131): Remove null check once we have proper paths for fields
            // within arrays.
            if (this.path) for (var t = 0; t < this.path.length; t++) this.lf(this.path.get(t));
        }, t.prototype.lf = function(t) {
            if (0 === t.length) throw this.Y_("Document fields must not be empty");
            if (Is(this.H_) && ms.test(t)) throw this.Y_('Document fields cannot begin and end with "__"');
        }, t;
    }(), Ts = /** @class */ function() {
        function t(t, e, n) {
            this.s = t, this.ignoreUndefinedProperties = e, this.serializer = n || ko(t)
            /** Creates a new top-level parse context. */;
        }
        return t.prototype.wf = function(t, e, n, r) {
            return void 0 === r && (r = !1), new Es({
                H_: t,
                methodName: e,
                J_: n,
                path: V.$(),
                X_: !1,
                df: r
            }, this.s, this.serializer, this.ignoreUndefinedProperties);
        }, t;
    }();

    /**
     * Helper for parsing raw user input (provided via the API) into internal model
     * classes.
     */
    /** Parse document data from a set() call. */ function Ns(t, e, n, r, i, o) {
        void 0 === o && (o = {});
        var s = t.wf(o.merge || o.mergeFields ? 2 /* MergeSet */ : 0 /* Set */ , e, n, i);
        Rs("Data must be an object, but it was:", s, r);
        var u, a, c = ks(r, s);
        if (o.merge) u = new Oe(s.qe), a = s.fieldTransforms; else if (o.mergeFields) {
            for (var h = [], f = 0, l = o.mergeFields; f < l.length; f++) {
                var p = l[f], y = void 0;
                if (p instanceof os) y = p.j_; else {
                    if ("string" != typeof p) throw d();
                    y = Os(e, p, n);
                }
                if (!s.contains(y)) throw new x(D.INVALID_ARGUMENT, "Field '" + y + "' is specified in your field mask but missing from your input data.");
                Us(h, y) || h.push(y);
            }
            u = new Oe(h), a = s.fieldTransforms.filter((function(t) {
                return u.Ke(t.field);
            }));
        } else u = null, a = s.fieldTransforms;
        return new bs(new Je(c), u, a);
    }

    /** Parse update data from an update() call. */ function As(t, e, n, r) {
        var i = t.wf(1 /* Update */ , e, n);
        Rs("Data must be an object, but it was:", i, r);
        var o = [], s = new tn;
        N(r, (function(t, r) {
            var u = Os(e, t, n), a = i._f(u);
            if (r instanceof as && r.K_ instanceof cs) 
            // Add it to the field mask, but don't add anything to updateData.
            o.push(u); else {
                var c = xs(r, a);
                null != c && (o.push(u), s.set(u, c));
            }
        }));
        var u = new Oe(o);
        return new _s(s.ze(), u, i.fieldTransforms);
    }

    /** Parse update data from a list of field/value arguments. */ function Ss(t, e, n, r, i, o) {
        var s = t.wf(1 /* Update */ , e, n), u = [ Ps(e, r, n) ], a = [ i ];
        if (o.length % 2 != 0) throw new x(D.INVALID_ARGUMENT, "Function " + e + "() needs to be called with an even number of arguments that alternate between field names and values.");
        for (var c = 0; c < o.length; c += 2) u.push(Ps(e, o[c])), a.push(o[c + 1]);
        // We iterate in reverse order to pick the last value for a field if the
        // user specified the field multiple times.
        for (var h = [], f = new tn, l = u.length - 1; l >= 0; --l) if (!Us(h, u[l])) {
            var p = u[l], d = a[l], y = s._f(p);
            if (d instanceof as && d.K_ instanceof cs) 
            // Add it to the field mask, but don't add anything to updateData.
            h.push(p); else {
                var v = xs(d, y);
                null != v && (h.push(p), f.set(p, v));
            }
        }
        var g = new Oe(h);
        return new _s(f.ze(), g, s.fieldTransforms);
    }

    /**
     * Parse a "query value" (e.g. value in a where filter or a value in a cursor
     * bound).
     *
     * @param allowArrays Whether the query value is an array that may directly
     * contain additional arrays (e.g. the operand of an `in` query).
     */ function Ds(t, e, n, r) {
        return void 0 === r && (r = !1), xs(n, t.wf(r ? 4 /* ArrayArgument */ : 3 /* Argument */ , e));
    }

    /**
     * Parses user data to Protobuf Values.
     *
     * @param input Data to be parsed.
     * @param context A context object representing the current path being parsed,
     * the source of the data being parsed, etc.
     * @return The parsed value, or null if the value was a FieldValue sentinel
     * that should not be included in the resulting parsed data.
     */ function xs(t, e) {
        if (Ls(t)) return Rs("Unsupported field value:", e, t), ks(t, e);
        if (t instanceof as) 
        // FieldValues usually parse into transforms (except FieldValue.delete())
        // in which case we do not want to include this field in our parsed data
        // (as doing so will overwrite the field directly prior to the transform
        // trying to transform it). So we don't add this location to
        // context.fieldMask and we return null as our parsing result.
        /**
         * "Parses" the provided FieldValueImpl, adding any necessary transforms to
         * context.fieldTransforms.
         */
        return function(t, e) {
            // Sentinels are only supported with writes, and not within arrays.
            if (!Is(e.H_)) throw e.Y_(t.G_ + "() can only be used with update() and set()");
            if (!e.path) throw e.Y_(t.G_ + "() is not currently supported inside arrays");
            var n = t.z_(e);
            n && e.fieldTransforms.push(n);
        }(t, e), null;
        if (
        // If context.path is null we are inside an array and we don't support
        // field mask paths more granular than the top-level array.
        e.path && e.qe.push(e.path), t instanceof Array) {
            // TODO(b/34871131): Include the path containing the array in the error
            // message.
            // In the case of IN queries, the parsed data is an array (representing
            // the set of values to be included for the IN query) that may directly
            // contain additional arrays (each representing an individual field
            // value), so we disable this validation.
            if (e.settings.X_ && 4 /* ArrayArgument */ !== e.H_) throw e.Y_("Nested arrays are not supported");
            return function(t, e) {
                for (var n = [], r = 0, i = 0, o = t; i < o.length; i++) {
                    var s = xs(o[i], e.ff(r));
                    null == s && (
                    // Just include nulls in the array for fields being replaced with a
                    // sentinel.
                    s = {
                        nullValue: "NULL_VALUE"
                    }), n.push(s), r++;
                }
                return {
                    arrayValue: {
                        values: n
                    }
                };
            }(t, e);
        }
        return function(t, e) {
            if (null === t) return {
                nullValue: "NULL_VALUE"
            };
            if ("number" == typeof t) return Kt(e.serializer, t);
            if ("boolean" == typeof t) return {
                booleanValue: t
            };
            if ("string" == typeof t) return {
                stringValue: t
            };
            if (t instanceof Date) {
                var n = k.fromDate(t);
                return {
                    timestampValue: Yt(e.serializer, n)
                };
            }
            if (t instanceof k) {
                // Firestore backend truncates precision down to microseconds. To ensure
                // offline mode works the same with regards to truncation, perform the
                // truncation immediately without waiting for the backend to do that.
                var r = new k(t.seconds, 1e3 * Math.floor(t.nanoseconds / 1e3));
                return {
                    timestampValue: Yt(e.serializer, r)
                };
            }
            if (t instanceof gs) return {
                geoPointValue: {
                    latitude: t.latitude,
                    longitude: t.longitude
                }
            };
            if (t instanceof is) return {
                bytesValue: Zt(e.serializer, t)
            };
            if (t instanceof ws) {
                var i = e.s, o = t.sf;
                if (!o.isEqual(i)) throw e.Y_("Document reference is for database " + o.projectId + "/" + o.database + " but should be for database " + i.projectId + "/" + i.database);
                return {
                    referenceValue: Jt(t.sf || e.s, t.if.path)
                };
            }
            if (void 0 === t && e.ignoreUndefinedProperties) return null;
            throw e.Y_("Unsupported field value: " + Yo(t));
        }(t, e);
    }

    function ks(t, e) {
        var n = {};
        return A(t) ? 
        // If we encounter an empty object, we explicitly add it to the update
        // mask to ensure that the server creates a map entry.
        e.path && e.path.length > 0 && e.qe.push(e.path) : N(t, (function(t, r) {
            var i = xs(r, e.cf(t));
            null != i && (n[t] = i);
        })), {
            mapValue: {
                fields: n
            }
        };
    }

    function Ls(t) {
        return !("object" != typeof t || null === t || t instanceof Array || t instanceof Date || t instanceof k || t instanceof gs || t instanceof is || t instanceof ws || t instanceof as);
    }

    function Rs(t, e, n) {
        if (!Ls(n) || !Ko(n)) {
            var r = Yo(n);
            throw "an object" === r ? e.Y_(t + " a custom object") : e.Y_(t + " " + r);
        }
    }

    /**
     * Helper that calls fromDotSeparatedString() but wraps any error thrown.
     */ function Ps(t, e, n) {
        if (e instanceof os) return e.j_;
        if ("string" == typeof e) return Os(t, e);
        throw Vs("Field path arguments must be of type string or FieldPath.", t, 
        /* hasConverter= */ !1, 
        /* path= */ void 0, n);
    }

    /**
     * Wraps fromDotSeparatedString with an error message about the method that
     * was thrown.
     * @param methodName The publicly visible method name
     * @param path The dot-separated string form of a field path which will be split
     * on dots.
     * @param targetDoc The document against which the field path will be evaluated.
     */ function Os(e, n, r) {
        try {
            return function(e) {
                if (e.search(us) >= 0) throw new x(D.INVALID_ARGUMENT, "Invalid field path (" + e + "). Paths must not contain '~', '*', '/', '[', or ']'");
                try {
                    return new (ss.bind.apply(ss, t.__spreadArrays([ void 0 ], e.split("."))));
                } catch (t) {
                    throw new x(D.INVALID_ARGUMENT, "Invalid field path (" + e + "). Paths must not be empty, begin with '.', end with '.', or contain '..'");
                }
            }(n).j_;
        } catch (n) {
            throw Vs((i = n) instanceof Error ? i.message : i.toString(), e, 
            /* hasConverter= */ !1, 
            /* path= */ void 0, r);
        }
        /**
     * Extracts the message from a caught exception, which should be an Error object
     * though JS doesn't guarantee that.
     */    var i;
        /** Checks `haystack` if FieldPath `needle` is present. Runs in O(n). */}

    function Vs(t, e, n, r, i) {
        var o = r && !r._(), s = void 0 !== i, u = "Function " + e + "() called with invalid data";
        n && (u += " (via `toFirestore()`)");
        var a = "";
        return (o || s) && (a += " (found", o && (a += " in field " + r), s && (a += " in document " + i), 
        a += ")"), new x(D.INVALID_ARGUMENT, (u += ". ") + t + a);
    }

    function Us(t, e) {
        return t.some((function(t) {
            return t.isEqual(e);
        }));
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Internal transaction object responsible for accumulating the mutations to
     * perform and the base versions for any documents read.
     */ var Cs = /** @class */ function() {
        function e(t) {
            this.qa = t, 
            // The version of each document that was read during this transaction.
            this.Tf = new Map, this.mutations = [], this.Ef = !1, 
            /**
                 * A deferred usage error that occurred previously in this transaction that
                 * will cause the transaction to fail once it actually commits.
                 */
            this.If = null, 
            /**
                 * Set of documents that have been written in the transaction.
                 *
                 * When there's more than one write to the same key in a transaction, any
                 * writes after the first are handled differently.
                 */
            this.mf = new Set;
        }
        return e.prototype.Af = function(e) {
            return t.__awaiter(this, void 0, void 0, (function() {
                var n, r = this;
                return t.__generator(this, (function(i) {
                    switch (i.label) {
                      case 0:
                        if (this.Rf(), this.mutations.length > 0) throw new x(D.INVALID_ARGUMENT, "Firestore transactions require all reads to be executed before all writes.");
                        return [ 4 /*yield*/ , function(e, n) {
                            return t.__awaiter(this, void 0, void 0, (function() {
                                var r, i, o, s, u, a;
                                return t.__generator(this, (function(t) {
                                    switch (t.label) {
                                      case 0:
                                        return r = v(e), i = oe(r.serializer) + "/documents", o = {
                                            documents: n.map((function(t) {
                                                return ee(r.serializer, t);
                                            }))
                                        }, [ 4 /*yield*/ , r.Sa("BatchGetDocuments", i, o) ];

                                      case 1:
                                        return s = t.sent(), u = new Map, s.forEach((function(t) {
                                            var e = function(t, e) {
                                                return "found" in e ? function(t, e) {
                                                    y(!!e.found), e.found.name, e.found.updateTime;
                                                    var n = ne(t, e.found.name), r = $t(e.found.updateTime), i = new Je({
                                                        mapValue: {
                                                            fields: e.found.fields
                                                        }
                                                    });
                                                    return new rn(n, r, i, {});
                                                }(t, e) : "missing" in e ? function(t, e) {
                                                    y(!!e.missing), y(!!e.readTime);
                                                    var n = ne(t, e.missing), r = $t(e.readTime);
                                                    return new on(n, r);
                                                }(t, e) : d();
                                            }(r.serializer, t);
                                            u.set(e.key.toString(), e);
                                        })), a = [], [ 2 /*return*/ , (n.forEach((function(t) {
                                            var e = u.get(t.toString());
                                            y(!!e), a.push(e);
                                        })), a) ];
                                    }
                                }));
                            }));
                        }(this.qa, e) ];

                      case 1:
                        return [ 2 /*return*/ , ((n = i.sent()).forEach((function(t) {
                            t instanceof on || t instanceof rn ? r.Pf(t) : d();
                        })), n) ];
                    }
                }));
            }));
        }, e.prototype.set = function(t, e) {
            this.write(e.hf(t, this.Qe(t))), this.mf.add(t.toString());
        }, e.prototype.update = function(t, e) {
            try {
                this.write(e.hf(t, this.gf(t)));
            } catch (t) {
                this.If = t;
            }
            this.mf.add(t.toString());
        }, e.prototype.delete = function(t) {
            this.write([ new Xe(t, this.Qe(t)) ]), this.mf.add(t.toString());
        }, e.prototype.commit = function() {
            return t.__awaiter(this, void 0, void 0, (function() {
                var e, n = this;
                return t.__generator(this, (function(r) {
                    switch (r.label) {
                      case 0:
                        if (this.Rf(), this.If) throw this.If;
                        return e = this.Tf, 
                        // For each mutation, note that the doc was written.
                        this.mutations.forEach((function(t) {
                            e.delete(t.key.toString());
                        })), 
                        // For each document that was read but not written to, we want to perform
                        // a `verify` operation.
                        e.forEach((function(t, e) {
                            var r = U.B(e);
                            n.mutations.push(new $e(r, n.Qe(r)));
                        })), [ 4 /*yield*/ , function(e, n) {
                            return t.__awaiter(this, void 0, void 0, (function() {
                                var r, i, o;
                                return t.__generator(this, (function(t) {
                                    switch (t.label) {
                                      case 0:
                                        return r = v(e), i = oe(r.serializer) + "/documents", o = {
                                            writes: n.map((function(t) {
                                                return ae(r.serializer, t);
                                            }))
                                        }, [ 4 /*yield*/ , r.va("Commit", i, o) ];

                                      case 1:
                                        return t.sent(), [ 2 /*return*/ ];
                                    }
                                }));
                            }));
                        }(this.qa, this.mutations) ];

                      case 1:
                        // For each mutation, note that the doc was written.
                        return r.sent(), this.Ef = !0, [ 2 /*return*/ ];
                    }
                }));
            }));
        }, e.prototype.Pf = function(t) {
            var e;
            if (t instanceof rn) e = t.version; else {
                if (!(t instanceof on)) throw d();
                // For deleted docs, we must use baseVersion 0 when we overwrite them.
                            e = L.min();
            }
            var n = this.Tf.get(t.key.toString());
            if (n) {
                if (!e.isEqual(n)) 
                // This transaction will fail no matter what.
                throw new x(D.ABORTED, "Document version changed between two reads.");
            } else this.Tf.set(t.key.toString(), e);
        }, 
        /**
         * Returns the version of this document when it was read in this transaction,
         * as a precondition, or no precondition if it was not read.
         */
        e.prototype.Qe = function(t) {
            var e = this.Tf.get(t.toString());
            return !this.mf.has(t.toString()) && e ? Ce.updateTime(e) : Ce.We();
        }, 
        /**
         * Returns the precondition for a document if the operation is an update.
         */
        e.prototype.gf = function(t) {
            var e = this.Tf.get(t.toString());
            // The first time a document is written, we want to take into account the
            // read time and existence
                    if (!this.mf.has(t.toString()) && e) {
                if (e.isEqual(L.min())) 
                // The document doesn't exist, so fail the transaction.
                // This has to be validated locally because you can't send a
                // precondition that a document does not exist without changing the
                // semantics of the backend write to be an insert. This is the reverse
                // of what we want, since we want to assert that the document doesn't
                // exist but then send the update and have it fail. Since we can't
                // express that to the backend, we have to validate locally.
                // Note: this can change once we can send separate verify writes in the
                // transaction.
                throw new x(D.INVALID_ARGUMENT, "Can't update a document that doesn't exist.");
                // Document exists, base precondition on document update time.
                            return Ce.updateTime(e);
            }
            // Document was not read, so we just use the preconditions for a blind
            // update.
                    return Ce.exists(!0);
        }, e.prototype.write = function(t) {
            this.Rf(), this.mutations = this.mutations.concat(t);
        }, e.prototype.Rf = function() {}, e;
    }(), qs = /** @class */ function() {
        function e(t, e, n, r) {
            this.ei = t, this.qa = e, this.updateFunction = n, this.ii = r, this.Vf = 5, this.Ti = new Kn(this.ei, "transaction_retry" /* TransactionRetry */)
            /** Runs the transaction and sets the result on deferred. */;
        }
        return e.prototype.run = function() {
            this.yf();
        }, e.prototype.yf = function() {
            var e = this;
            this.Ti.bs((function() {
                return t.__awaiter(e, void 0, void 0, (function() {
                    var e, n, r = this;
                    return t.__generator(this, (function(t) {
                        return e = new Cs(this.qa), (n = this.pf(e)) && n.then((function(t) {
                            r.ei.ai((function() {
                                return e.commit().then((function() {
                                    r.ii.resolve(t);
                                })).catch((function(t) {
                                    r.bf(t);
                                }));
                            }));
                        })).catch((function(t) {
                            r.bf(t);
                        })), [ 2 /*return*/ ];
                    }));
                }));
            }));
        }, e.prototype.pf = function(t) {
            try {
                var e = this.updateFunction(t);
                return !C(e) && e.catch && e.then ? e : (this.ii.reject(Error("Transaction callback must return a Promise")), 
                null);
            } catch (t) {
                // Do not retry errors thrown by user provided updateFunction.
                return this.ii.reject(t), null;
            }
        }, e.prototype.bf = function(t) {
            var e = this;
            this.Vf > 0 && this.vf(t) ? (this.Vf -= 1, this.ei.ai((function() {
                return e.yf(), Promise.resolve();
            }))) : this.ii.reject(t);
        }, e.prototype.vf = function(t) {
            if ("FirebaseError" === t.name) {
                // In transactions, the backend will fail outdated reads with FAILED_PRECONDITION and
                // non-matching document versions with ABORTED. These errors should be retried.
                var e = t.code;
                return "aborted" === e || "failed-precondition" === e || !Z(e);
            }
            return !1;
        }, e;
    }(), Ms = /** @class */ function() {
        function e(t, 
        /**
         * Asynchronous queue responsible for all of our internal processing. When
         * we get incoming work from the user (via public API) or the network
         * (incoming GRPC messages), we should always schedule onto this queue.
         * This ensures all of our work is properly serialized (e.g. we don't
         * start processing a new operation while the previous one is waiting for
         * an async I/O to complete).
         */
        e) {
            this.credentials = t, this.ei = e, this.clientId = m.t(), 
            // We defer our initialization until we get the current user from
            // setChangeListener(). We block the async queue until we got the initial
            // user and the initialization is completed. This will prevent any scheduled
            // work from happening before initialization is completed.
            // If initializationDone resolved then the FirestoreClient is in a usable
            // state.
            this.Sf = new Hn
            /**
         * Starts up the FirestoreClient, returning only whether or not enabling
         * persistence succeeded.
         *
         * The intent here is to "do the right thing" as far as users are concerned.
         * Namely, in cases where offline persistence is requested and possible,
         * enable it, but otherwise fall back to persistence disabled. For the most
         * part we expect this to succeed one way or the other so we don't expect our
         * users to actually wait on the firestore.enablePersistence Promise since
         * they generally won't care.
         *
         * Of course some users actually do care about whether or not persistence
         * was successfully enabled, so the Promise returned from this method
         * indicates this outcome.
         *
         * This presents a problem though: even before enablePersistence resolves or
         * rejects, users may have made calls to e.g. firestore.collection() which
         * means that the FirestoreClient in there will be available and will be
         * enqueuing actions on the async queue.
         *
         * Meanwhile any failure of an operation on the async queue causes it to
         * panic and reject any further work, on the premise that unhandled errors
         * are fatal.
         *
         * Consequently the fallback is handled internally here in start, and if the
         * fallback succeeds we signal success to the async queue even though the
         * start() itself signals failure.
         *
         * @param databaseInfo The connection information for the current instance.
         * @param offlineComponentProvider Provider that returns all components
         * required for memory-only or IndexedDB persistence.
         * @param onlineComponentProvider Provider that returns all components
         * required for online support.
         * @param persistenceSettings Settings object to configure offline
         *     persistence.
         * @returns A deferred result indicating the user-visible result of enabling
         *     offline persistence. This method will reject this if IndexedDB fails to
         *     start for any reason. If usePersistence is false this is
         *     unconditionally resolved.
         */;
        }
        return e.prototype.start = function(t, e, n, r) {
            var i = this;
            this.Df(), this.w_ = t;
            // If usePersistence is true, certain classes of errors while starting are
            // recoverable but only by falling back to persistence disabled.
            // If there's an error in the first case but not in recovery we cannot
            // reject the promise blocking the async queue because this will cause the
            // async queue to panic.
            var o = new Hn, s = !1;
            // Return only the result of enabling persistence. Note that this does not
            // need to await the completion of initializationDone because the result of
            // this method should not reflect any other kind of failure to start.
            return this.credentials.Bh((function(t) {
                if (!s) return s = !0, h("FirestoreClient", "Initializing. user=", t.uid), i.Cf(e, n, r, t, o).then(i.Sf.resolve, i.Sf.reject);
                i.ei.gi((function() {
                    return i.Bc.vu(t);
                }));
            })), 
            // Block the async queue until initialization is done
            this.ei.ai((function() {
                return i.Sf.promise;
            })), o.promise;
        }, 
        /** Enables the network connection and requeues all pending operations. */ e.prototype.enableNetwork = function() {
            var t = this;
            return this.Df(), this.ei.enqueue((function() {
                return t.persistence.Uo(!0), t.Bc.enableNetwork();
            }));
        }, 
        /**
         * Initializes persistent storage, attempting to use IndexedDB if
         * usePersistence is true or memory-only if false.
         *
         * If IndexedDB fails because it's already open in another tab or because the
         * platform can't possibly support our implementation then this method rejects
         * the persistenceResult and falls back on memory-only persistence.
         *
         * @param offlineComponentProvider Provider that returns all components
         * required for memory-only or IndexedDB persistence.
         * @param onlineComponentProvider Provider that returns all components
         * required for online support.
         * @param persistenceSettings Settings object to configure offline persistence
         * @param user The initial user
         * @param persistenceResult A deferred result indicating the user-visible
         *     result of enabling offline persistence. This method will reject this if
         *     IndexedDB fails to start for any reason. If usePersistence is false
         *     this is unconditionally resolved.
         * @returns a Promise indicating whether or not initialization should
         *     continue, i.e. that one of the persistence implementations actually
         *     succeeded.
         */
        e.prototype.Cf = function(e, n, r, i, o) {
            return t.__awaiter(this, void 0, void 0, (function() {
                var s, u, a = this;
                return t.__generator(this, (function(c) {
                    switch (c.label) {
                      case 0:
                        return c.trys.push([ 0, 3, , 4 ]), s = {
                            ei: this.ei,
                            w_: this.w_,
                            clientId: this.clientId,
                            credentials: this.credentials,
                            N_: i,
                            Qc: 100,
                            k_: r
                        }, [ 4 /*yield*/ , e.initialize(s) ];

                      case 1:
                        return c.sent(), [ 4 /*yield*/ , n.initialize(e, s) ];

                      case 2:
                        return c.sent(), this.persistence = e.persistence, this.Uc = e.Uc, this.La = e.La, 
                        this.S_ = e.S_, this.qa = n.qa, this.Bc = n.Bc, this.fu = n.fu, this.Nf = n.q_, 
                        // When a user calls clearPersistence() in one client, all other clients
                        // need to be terminated to allow the delete to succeed.
                        this.persistence.Bo((function() {
                            return t.__awaiter(a, void 0, void 0, (function() {
                                return t.__generator(this, (function(t) {
                                    switch (t.label) {
                                      case 0:
                                        return [ 4 /*yield*/ , this.terminate() ];

                                      case 1:
                                        return t.sent(), [ 2 /*return*/ ];
                                    }
                                }));
                            }));
                        })), o.resolve(), [ 3 /*break*/ , 4 ];

                      case 3:
                        // An unknown failure on the first stage shuts everything down.
                        if (u = c.sent(), 
                        // Regardless of whether or not the retry succeeds, from an user
                        // perspective, offline persistence has failed.
                        o.reject(u), !this.Ff(u)) throw u;
                        return [ 2 /*return*/ , (console.warn("Error enabling offline persistence. Falling back to persistence disabled: " + u), 
                        this.Cf(new Ro, new Oo, {
                            F_: !1
                        }, i, o)) ];

                      case 4:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        }, 
        /**
         * Decides whether the provided error allows us to gracefully disable
         * persistence (as opposed to crashing the client).
         */
        e.prototype.Ff = function(t) {
            return "FirebaseError" === t.name ? t.code === D.FAILED_PRECONDITION || t.code === D.UNIMPLEMENTED : !("undefined" != typeof DOMException && t instanceof DOMException) || 
            // When the browser is out of quota we could get either quota exceeded
            // or an aborted error depending on whether the error happened during
            // schema migration.
            22 === t.code || 20 === t.code || 
            // Firefox Private Browsing mode disables IndexedDb and returns
            // INVALID_STATE for any usage.
            11 === t.code;
        }, 
        /**
         * Checks that the client has not been terminated. Ensures that other methods on
         * this class cannot be called after the client is terminated.
         */
        e.prototype.Df = function() {
            if (this.ei.Ii) throw new x(D.FAILED_PRECONDITION, "The client has already been terminated.");
        }, 
        /** Disables the network connection. Pending operations will not complete. */ e.prototype.disableNetwork = function() {
            var t = this;
            return this.Df(), this.ei.enqueue((function() {
                return t.persistence.Uo(!1), t.Bc.disableNetwork();
            }));
        }, e.prototype.terminate = function() {
            var e = this;
            this.ei.Pi();
            var n = new Hn;
            return this.ei.mi((function() {
                return t.__awaiter(e, void 0, void 0, (function() {
                    var e, r;
                    return t.__generator(this, (function(t) {
                        switch (t.label) {
                          case 0:
                            return t.trys.push([ 0, 4, , 5 ]), 
                            // PORTING NOTE: LocalStore does not need an explicit shutdown on web.
                            this.S_ && this.S_.stop(), [ 4 /*yield*/ , this.Bc.th() ];

                          case 1:
                            return t.sent(), [ 4 /*yield*/ , this.Uc.th() ];

                          case 2:
                            return t.sent(), [ 4 /*yield*/ , this.persistence.th() ];

                          case 3:
                            // PORTING NOTE: LocalStore does not need an explicit shutdown on web.
                            return t.sent(), 
                            // `removeChangeListener` must be called after shutting down the
                            // RemoteStore as it will prevent the RemoteStore from retrieving
                            // auth tokens.
                            this.credentials.Uh(), n.resolve(), [ 3 /*break*/ , 5 ];

                          case 4:
                            return e = t.sent(), r = ar(e, "Failed to shutdown persistence"), n.reject(r), [ 3 /*break*/ , 5 ];

                          case 5:
                            return [ 2 /*return*/ ];
                        }
                    }));
                }));
            })), n.promise;
        }, 
        /**
         * Returns a Promise that resolves when all writes that were pending at the time this
         * method was called received server acknowledgement. An acknowledgement can be either acceptance
         * or rejection.
         */
        e.prototype.waitForPendingWrites = function() {
            var t = this;
            this.Df();
            var e = new Hn;
            return this.ei.ai((function() {
                return t.fu._l(e);
            })), e.promise;
        }, e.prototype.listen = function(t, e, n) {
            var r = this;
            this.Df();
            var i = new Uo(n), o = new go(t, i, e);
            return this.ei.ai((function() {
                return r.Nf.listen(o);
            })), function() {
                i.Q_(), r.ei.ai((function() {
                    return r.Nf.lu(o);
                }));
            };
        }, e.prototype.kf = function(e) {
            return t.__awaiter(this, void 0, void 0, (function() {
                return t.__generator(this, (function(n) {
                    switch (n.label) {
                      case 0:
                        return this.Df(), [ 4 /*yield*/ , this.Sf.promise ];

                      case 1:
                        return [ 2 /*return*/ , (n.sent(), function(e, n, r) {
                            return t.__awaiter(this, void 0, void 0, (function() {
                                var i, o = this;
                                return t.__generator(this, (function(s) {
                                    switch (s.label) {
                                      case 0:
                                        return i = new Hn, [ 4 /*yield*/ , e.enqueue((function() {
                                            return t.__awaiter(o, void 0, void 0, (function() {
                                                var e, o, s;
                                                return t.__generator(this, (function(t) {
                                                    switch (t.label) {
                                                      case 0:
                                                        return t.trys.push([ 0, 2, , 3 ]), [ 4 /*yield*/ , function(t, e) {
                                                            var n = v(t);
                                                            return n.persistence.runTransaction("read document", "readonly", (function(t) {
                                                                return n.Rh.Hn(t, e);
                                                            }));
                                                        }(n, r) ];

                                                      case 1:
                                                        return (e = t.sent()) instanceof rn ? i.resolve(e) : e instanceof on ? i.resolve(null) : i.reject(new x(D.UNAVAILABLE, "Failed to get document from cache. (However, this document may exist on the server. Run again without setting 'source' in the GetOptions to attempt to retrieve the document from the server.)")), 
                                                        [ 3 /*break*/ , 3 ];

                                                      case 2:
                                                        return o = t.sent(), s = ar(o, "Failed to get document '" + r + " from cache"), 
                                                        i.reject(s), [ 3 /*break*/ , 3 ];

                                                      case 3:
                                                        return [ 2 /*return*/ ];
                                                    }
                                                }));
                                            }));
                                        })) ];

                                      case 1:
                                        return [ 2 /*return*/ , (s.sent(), i.promise) ];
                                    }
                                }));
                            }));
                        }(this.ei, this.La, e)) ];
                    }
                }));
            }));
        }, e.prototype.$f = function(e, n) {
            return t.__awaiter(this, void 0, void 0, (function() {
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        return this.Df(), [ 4 /*yield*/ , this.Sf.promise ];

                      case 1:
                        return [ 2 /*return*/ , (t.sent(), function(t, e, n, r) {
                            var i = new Hn, o = Fs(t, e, hn(n.path), {
                                includeMetadataChanges: !0,
                                $l: !0
                            }, {
                                next: function(t) {
                                    // Remove query first before passing event to user to avoid
                                    // user actions affecting the now stale query.
                                    o();
                                    var e = t.docs.has(n);
                                    !e && t.fromCache ? 
                                    // TODO(dimond): If we're online and the document doesn't
                                    // exist then we resolve with a doc.exists set to false. If
                                    // we're offline however, we reject the Promise in this
                                    // case. Two options: 1) Cache the negative response from
                                    // the server so we can deliver that even when you're
                                    // offline 2) Actually reject the Promise in the online case
                                    // if the document doesn't exist.
                                    i.reject(new x(D.UNAVAILABLE, "Failed to get document because the client is offline.")) : e && t.fromCache && r && "server" === r.source ? i.reject(new x(D.UNAVAILABLE, 'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')) : i.resolve(t);
                                },
                                error: function(t) {
                                    return i.reject(t);
                                }
                            });
                            return i.promise;
                        }(this.ei, this.Nf, e, n)) ];
                    }
                }));
            }));
        }, e.prototype.xf = function(e) {
            return t.__awaiter(this, void 0, void 0, (function() {
                return t.__generator(this, (function(n) {
                    switch (n.label) {
                      case 0:
                        return this.Df(), [ 4 /*yield*/ , this.Sf.promise ];

                      case 1:
                        return [ 2 /*return*/ , (n.sent(), function(e, n, r) {
                            return t.__awaiter(this, void 0, void 0, (function() {
                                var i, o = this;
                                return t.__generator(this, (function(s) {
                                    switch (s.label) {
                                      case 0:
                                        return i = new Hn, [ 4 /*yield*/ , e.enqueue((function() {
                                            return t.__awaiter(o, void 0, void 0, (function() {
                                                var e, o, s, u, a, c;
                                                return t.__generator(this, (function(t) {
                                                    switch (t.label) {
                                                      case 0:
                                                        return t.trys.push([ 0, 2, , 3 ]), [ 4 /*yield*/ , Si(n, r, 
                                                        /* usePreviousResults= */ !0) ];

                                                      case 1:
                                                        return e = t.sent(), o = new no(r, e.gh), s = o.Sc(e.documents), u = o.Un(s, 
                                                        /* updateLimboDocuments= */ !1), i.resolve(u.snapshot), [ 3 /*break*/ , 3 ];

                                                      case 2:
                                                        return a = t.sent(), c = ar(a, "Failed to execute query '" + r + " against cache"), 
                                                        i.reject(c), [ 3 /*break*/ , 3 ];

                                                      case 3:
                                                        return [ 2 /*return*/ ];
                                                    }
                                                }));
                                            }));
                                        })) ];

                                      case 1:
                                        return [ 2 /*return*/ , (s.sent(), i.promise) ];
                                    }
                                }));
                            }));
                        }(this.ei, this.La, e)) ];
                    }
                }));
            }));
        }, e.prototype.Of = function(e, n) {
            return t.__awaiter(this, void 0, void 0, (function() {
                return t.__generator(this, (function(t) {
                    switch (t.label) {
                      case 0:
                        return this.Df(), [ 4 /*yield*/ , this.Sf.promise ];

                      case 1:
                        return [ 2 /*return*/ , (t.sent(), function(t, e, n, r) {
                            var i = new Hn, o = Fs(t, e, n, {
                                includeMetadataChanges: !0,
                                $l: !0
                            }, {
                                next: function(t) {
                                    // Remove query first before passing event to user to avoid
                                    // user actions affecting the now stale query.
                                    o(), t.fromCache && r && "server" === r.source ? i.reject(new x(D.UNAVAILABLE, 'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')) : i.resolve(t);
                                },
                                error: function(t) {
                                    return i.reject(t);
                                }
                            });
                            return i.promise;
                        }(this.ei, this.Nf, e, n)) ];
                    }
                }));
            }));
        }, e.prototype.write = function(t) {
            var e = this;
            this.Df();
            var n = new Hn;
            return this.ei.ai((function() {
                return e.fu.write(t, n);
            })), n.promise;
        }, e.prototype.s = function() {
            return this.w_.s;
        }, e.prototype.bl = function(e) {
            var n = this;
            this.Df();
            var r = new Uo(e);
            return this.ei.ai((function() {
                return t.__awaiter(n, void 0, void 0, (function() {
                    return t.__generator(this, (function(t) {
                        return [ 2 /*return*/ , this.Nf.bl(r) ];
                    }));
                }));
            })), function() {
                r.Q_(), n.ei.ai((function() {
                    return t.__awaiter(n, void 0, void 0, (function() {
                        return t.__generator(this, (function(t) {
                            return [ 2 /*return*/ , this.Nf.vl(r) ];
                        }));
                    }));
                }));
            };
        }, Object.defineProperty(e.prototype, "Mf", {
            get: function() {
                // Technically, the asyncQueue is still running, but only accepting operations
                // related to termination or supposed to be run after termination. It is effectively
                // terminated to the eyes of users.
                return this.ei.Ii;
            },
            enumerable: !1,
            configurable: !0
        }), 
        /**
         * Takes an updateFunction in which a set of reads and writes can be performed
         * atomically. In the updateFunction, the client can read and write values
         * using the supplied transaction object. After the updateFunction, all
         * changes will be committed. If a retryable error occurs (ex: some other
         * client has changed any of the data referenced), then the updateFunction
         * will be called again after a backoff. If the updateFunction still fails
         * after all retries, then the transaction will be rejected.
         *
         * The transaction object passed to the updateFunction contains methods for
         * accessing documents and collections. Unlike other datastore access, data
         * accessed with the transaction will not reflect local changes that have not
         * been committed. For this reason, it is required that all reads are
         * performed before any writes. Transactions must be performed while online.
         */
        e.prototype.transaction = function(t) {
            var e = this;
            this.Df();
            var n = new Hn;
            return this.ei.ai((function() {
                return new qs(e.ei, e.qa, t, n).run(), Promise.resolve();
            })), n.promise;
        }, e;
    }();

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * TransactionRunner encapsulates the logic needed to run and retry transactions
     * with backoff.
     */ function Fs(t, e, n, r, i) {
        var o = new Uo(i), s = new go(n, o, r);
        return t.ai((function() {
            return e.listen(s);
        })), function() {
            o.Q_(), t.ai((function() {
                return e.lu(s);
            }));
        };
    }

    var Gs = /** @class */ function() {
        function t(t, e, n, r) {
            this.s = t, this.timestampsInSnapshots = e, this.Lf = n, this.qf = r;
        }
        return t.prototype.Bf = function(t) {
            switch (Dt(t)) {
              case 0 /* NullValue */ :
                return null;

              case 1 /* BooleanValue */ :
                return t.booleanValue;

              case 2 /* NumberValue */ :
                return Vt(t.integerValue || t.doubleValue);

              case 3 /* TimestampValue */ :
                return this.Uf(t.timestampValue);

              case 4 /* ServerTimestampValue */ :
                return this.Qf(t);

              case 5 /* StringValue */ :
                return t.stringValue;

              case 6 /* BlobValue */ :
                return new is(Ut(t.bytesValue));

              case 7 /* RefValue */ :
                return this.Wf(t.referenceValue);

              case 8 /* GeoPointValue */ :
                return this.jf(t.geoPointValue);

              case 9 /* ArrayValue */ :
                return this.Kf(t.arrayValue);

              case 10 /* ObjectValue */ :
                return this.Gf(t.mapValue);

              default:
                throw d();
            }
        }, t.prototype.Gf = function(t) {
            var e = this, n = {};
            return N(t.fields || {}, (function(t, r) {
                n[t] = e.Bf(r);
            })), n;
        }, t.prototype.jf = function(t) {
            return new gs(Vt(t.latitude), Vt(t.longitude));
        }, t.prototype.Kf = function(t) {
            var e = this;
            return (t.values || []).map((function(t) {
                return e.Bf(t);
            }));
        }, t.prototype.Qf = function(t) {
            switch (this.Lf) {
              case "previous":
                var e = function t(e) {
                    var n = e.mapValue.fields.__previous_value__;
                    return Nt(n) ? t(n) : n;
                }(t);
                return null == e ? null : this.Bf(e);

              case "estimate":
                return this.Uf(At(t));

              default:
                return null;
            }
        }, t.prototype.Uf = function(t) {
            var e = Ot(t), n = new k(e.seconds, e.nanos);
            return this.timestampsInSnapshots ? n : n.toDate();
        }, t.prototype.Wf = function(t) {
            var e = P.k(t);
            y(_e(e));
            var n = new E(e.get(1), e.get(3)), r = new U(e.V(5));
            return n.isEqual(this.s) || 
            // TODO(b/64130202): Somehow support foreign references.
            f("Document " + r + " contains a document reference within a different database (" + n.projectId + "/" + n.database + ") which is not supported. It will be treated as a reference in the current database (" + this.s.projectId + "/" + this.s.database + ") instead."), 
            this.qf(r);
        }, t;
    }(), js = lr.ji, Bs = /** @class */ function() {
        function t(t) {
            var e, n, r, i;
            if (void 0 === t.host) {
                if (void 0 !== t.ssl) throw new x(D.INVALID_ARGUMENT, "Can't provide ssl option if host option is not set");
                this.host = "firestore.googleapis.com", this.ssl = !0;
            } else Bo("settings", "non-empty string", "host", t.host), this.host = t.host, zo("settings", "boolean", "ssl", t.ssl), 
            this.ssl = null === (e = t.ssl) || void 0 === e || e;
            if (Xo("settings", t, [ "host", "ssl", "credentials", "timestampsInSnapshots", "cacheSizeBytes", "experimentalForceLongPolling", "ignoreUndefinedProperties" ]), 
            zo("settings", "object", "credentials", t.credentials), this.credentials = t.credentials, 
            zo("settings", "boolean", "timestampsInSnapshots", t.timestampsInSnapshots), zo("settings", "boolean", "ignoreUndefinedProperties", t.ignoreUndefinedProperties), 
            // Nobody should set timestampsInSnapshots anymore, but the error depends on
            // whether they set it to true or false...
            !0 === t.timestampsInSnapshots ? f("The setting 'timestampsInSnapshots: true' is no longer required and should be removed.") : !1 === t.timestampsInSnapshots && f("Support for 'timestampsInSnapshots: false' will be removed soon. You must update your code to handle Timestamp objects."), 
            this.timestampsInSnapshots = null === (n = t.timestampsInSnapshots) || void 0 === n || n, 
            this.ignoreUndefinedProperties = null !== (r = t.ignoreUndefinedProperties) && void 0 !== r && r, 
            zo("settings", "number", "cacheSizeBytes", t.cacheSizeBytes), void 0 === t.cacheSizeBytes) this.cacheSizeBytes = lr.Gi; else {
                if (t.cacheSizeBytes !== js && t.cacheSizeBytes < lr.Ki) throw new x(D.INVALID_ARGUMENT, "cacheSizeBytes must be at least " + lr.Ki);
                this.cacheSizeBytes = t.cacheSizeBytes;
            }
            zo("settings", "boolean", "experimentalForceLongPolling", t.experimentalForceLongPolling), 
            this.experimentalForceLongPolling = null !== (i = t.experimentalForceLongPolling) && void 0 !== i && i;
        }
        return t.prototype.isEqual = function(t) {
            return this.host === t.host && this.ssl === t.ssl && this.timestampsInSnapshots === t.timestampsInSnapshots && this.credentials === t.credentials && this.cacheSizeBytes === t.cacheSizeBytes && this.experimentalForceLongPolling === t.experimentalForceLongPolling && this.ignoreUndefinedProperties === t.ignoreUndefinedProperties;
        }, t;
    }(), zs = /** @class */ function() {
        // Note: We are using `MemoryComponentProvider` as a default
        // ComponentProvider to ensure backwards compatibility with the format
        // expected by the console build.
        function e(n, r, i, o) {
            var s = this;
            if (void 0 === i && (i = new Ro), void 0 === o && (o = new Oo), this.zf = i, this.Hf = o, 
            this.Yf = null, 
            // Public for use in tests.
            // TODO(mikelehen): Use modularized initialization instead.
            this.Jf = new ur, this.INTERNAL = {
                delete: function() {
                    return t.__awaiter(s, void 0, void 0, (function() {
                        return t.__generator(this, (function(t) {
                            switch (t.label) {
                              case 0:
                                // The client must be initalized to ensure that all subsequent API usage
                                // throws an exception.
                                return this.Xf(), [ 4 /*yield*/ , this.Zf.terminate() ];

                              case 1:
                                // The client must be initalized to ensure that all subsequent API usage
                                // throws an exception.
                                return t.sent(), [ 2 /*return*/ ];
                            }
                        }));
                    }));
                }
            }, "object" == typeof n.options) {
                // This is very likely a Firebase app object
                // TODO(b/34177605): Can we somehow use instanceof?
                var u = n;
                this.Yf = u, this.sf = e.td(u), this.ed = u.name, this.nd = new Vi(r);
            } else {
                var a = n;
                if (!a.projectId) throw new x(D.INVALID_ARGUMENT, "Must provide projectId");
                this.sf = new E(a.projectId, a.database), 
                // Use a default persistenceKey that lines up with FirebaseApp.
                this.ed = "[DEFAULT]", this.nd = new Oi;
            }
            this.sd = new Bs({});
        }
        return Object.defineProperty(e.prototype, "rd", {
            get: function() {
                return this.od || (
                // Lazy initialize UserDataReader once the settings are frozen
                this.od = new Ts(this.sf, this.sd.ignoreUndefinedProperties)), this.od;
            },
            enumerable: !1,
            configurable: !0
        }), e.prototype.settings = function(t) {
            qo("Firestore.settings", arguments, 1), Go("Firestore.settings", "object", 1, t), 
            t.merge && 
            // Remove the property from the settings once the merge is completed
            delete (t = Object.assign(Object.assign({}, this.sd), t)).merge;
            var e = new Bs(t);
            if (this.Zf && !this.sd.isEqual(e)) throw new x(D.FAILED_PRECONDITION, "Firestore has already been started and its settings can no longer be changed. You can only call settings() before calling any other methods on a Firestore object.");
            this.sd = e, void 0 !== e.credentials && (this.nd = function(t) {
                if (!t) return new Oi;
                switch (t.type) {
                  case "gapi":
                    var e = t.hd;
                    // Make sure this really is a Gapi client.
                                    return y(!("object" != typeof e || null === e || !e.auth || !e.auth.getAuthHeaderValueForFirstParty)), 
                    new Ci(e, t.zh || "0");

                  case "provider":
                    return t.hd;

                  default:
                    throw new x(D.INVALID_ARGUMENT, "makeCredentialsProvider failed due to invalid credential type");
                }
            }(e.credentials));
        }, e.prototype.enableNetwork = function() {
            return this.Xf(), this.Zf.enableNetwork();
        }, e.prototype.disableNetwork = function() {
            return this.Xf(), this.Zf.disableNetwork();
        }, e.prototype.enablePersistence = function(t) {
            var e, n;
            if (this.Zf) throw new x(D.FAILED_PRECONDITION, "Firestore has already been started and persistence can no longer be enabled. You can only call enablePersistence() before calling any other methods on a Firestore object.");
            var r = !1, i = !1;
            if (t && (void 0 !== t.experimentalTabSynchronization && f("The 'experimentalTabSynchronization' setting will be removed. Use 'synchronizeTabs' instead."), 
            r = null !== (n = null !== (e = t.synchronizeTabs) && void 0 !== e ? e : t.experimentalTabSynchronization) && void 0 !== n && n, 
            i = !!t.experimentalForceOwningTab && t.experimentalForceOwningTab, r && i)) throw new x(D.INVALID_ARGUMENT, "The 'experimentalForceOwningTab' setting cannot be used with 'synchronizeTabs'.");
            return this.ad(this.zf, this.Hf, {
                F_: !0,
                cacheSizeBytes: this.sd.cacheSizeBytes,
                synchronizeTabs: r,
                Vo: i
            });
        }, e.prototype.clearPersistence = function() {
            return t.__awaiter(this, void 0, void 0, (function() {
                var e, n = this;
                return t.__generator(this, (function(r) {
                    if (void 0 !== this.Zf && !this.Zf.Mf) throw new x(D.FAILED_PRECONDITION, "Persistence can only be cleared before a Firestore instance is initialized or after it is terminated.");
                    return e = new Hn, [ 2 /*return*/ , (this.Jf.mi((function() {
                        return t.__awaiter(n, void 0, void 0, (function() {
                            var n;
                            return t.__generator(this, (function(t) {
                                switch (t.label) {
                                  case 0:
                                    return t.trys.push([ 0, 2, , 3 ]), [ 4 /*yield*/ , this.zf.clearPersistence(this.sf, this.ed) ];

                                  case 1:
                                    return t.sent(), e.resolve(), [ 3 /*break*/ , 3 ];

                                  case 2:
                                    return n = t.sent(), e.reject(n), [ 3 /*break*/ , 3 ];

                                  case 3:
                                    return [ 2 /*return*/ ];
                                }
                            }));
                        }));
                    })), e.promise) ];
                }));
            }));
        }, e.prototype.terminate = function() {
            return this.app._removeServiceInstance("firestore"), this.INTERNAL.delete();
        }, Object.defineProperty(e.prototype, "ud", {
            get: function() {
                return this.Xf(), this.Zf.Mf;
            },
            enumerable: !1,
            configurable: !0
        }), e.prototype.waitForPendingWrites = function() {
            return this.Xf(), this.Zf.waitForPendingWrites();
        }, e.prototype.onSnapshotsInSync = function(t) {
            if (this.Xf(), Vo(t)) return this.Zf.bl(t);
            Go("Firestore.onSnapshotsInSync", "function", 1, t);
            var e = {
                next: t
            };
            return this.Zf.bl(e);
        }, e.prototype.Xf = function() {
            return this.Zf || 
            // Kick off starting the client but don't actually wait for it.
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.ad(new Ro, new Oo, {
                F_: !1
            }), this.Zf;
        }, e.prototype.ld = function() {
            return new I(this.sf, this.ed, this.sd.host, this.sd.ssl, this.sd.experimentalForceLongPolling);
        }, e.prototype.ad = function(t, e, n) {
            var r = this.ld();
            return this.Zf = new Ms(this.nd, this.Jf), this.Zf.start(r, t, e, n);
        }, e.td = function(t) {
            if (e = t.options, !Object.prototype.hasOwnProperty.call(e, "projectId")) throw new x(D.INVALID_ARGUMENT, '"projectId" not provided in firebase.initializeApp.');
            var e, n = t.options.projectId;
            /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */        if (!n || "string" != typeof n) throw new x(D.INVALID_ARGUMENT, "projectId must be a string in FirebaseApp.options");
            return new E(n);
        }, Object.defineProperty(e.prototype, "app", {
            get: function() {
                if (!this.Yf) throw new x(D.FAILED_PRECONDITION, "Firestore was not initialized using the Firebase SDK. 'app' is not available");
                return this.Yf;
            },
            enumerable: !1,
            configurable: !0
        }), e.prototype.collection = function(t) {
            return qo("Firestore.collection", arguments, 1), Go("Firestore.collection", "non-empty string", 1, t), 
            this.Xf(), new ou(P.k(t), this, 
            /* converter= */ null);
        }, e.prototype.doc = function(t) {
            return qo("Firestore.doc", arguments, 1), Go("Firestore.doc", "non-empty string", 1, t), 
            this.Xf(), Hs._d(P.k(t), this, 
            /* converter= */ null);
        }, e.prototype.collectionGroup = function(t) {
            if (qo("Firestore.collectionGroup", arguments, 1), Go("Firestore.collectionGroup", "non-empty string", 1, t), 
            t.indexOf("/") >= 0) throw new x(D.INVALID_ARGUMENT, "Invalid collection ID '" + t + "' passed to function Firestore.collectionGroup(). Collection IDs must not contain '/'.");
            return this.Xf(), new ru(function(t) {
                return new an(P.$(), t);
            }(t), this, 
            /* converter= */ null);
        }, e.prototype.runTransaction = function(t) {
            var e = this;
            return qo("Firestore.runTransaction", arguments, 1), Go("Firestore.runTransaction", "function", 1, t), 
            this.Xf().transaction((function(n) {
                return t(new Qs(e, n));
            }));
        }, e.prototype.batch = function() {
            return this.Xf(), new Ws(this);
        }, Object.defineProperty(e, "logLevel", {
            get: function() {
                switch (c()) {
                  case n.LogLevel.DEBUG:
                    return "debug";

                  case n.LogLevel.ERROR:
                    return "error";

                  case n.LogLevel.SILENT:
                    return "silent";

                  case n.LogLevel.WARN:
                    return "warn";

                  case n.LogLevel.INFO:
                    return "info";

                  case n.LogLevel.VERBOSE:
                    return "verbose";

                  default:
                    // The default log level is error
                    return "error";
                }
            },
            enumerable: !1,
            configurable: !0
        }), e.setLogLevel = function(t) {
            var e;
            qo("Firestore.setLogLevel", arguments, 1), Wo("setLogLevel", [ "debug", "error", "silent", "warn", "info", "verbose" ], 1, t), 
            e = t, a.setLogLevel(e);
        }, 
        // Note: this is not a property because the minifier can't work correctly with
        // the way TypeScript compiler outputs properties.
        e.prototype.fd = function() {
            return this.sd.timestampsInSnapshots;
        }, 
        // Visible for testing.
        e.prototype.dd = function() {
            return this.sd;
        }, e;
    }(), Qs = /** @class */ function() {
        function t(t, e) {
            this.wd = t, this.Td = e;
        }
        return t.prototype.get = function(t) {
            var e = this;
            qo("Transaction.get", arguments, 1);
            var n = cu("Transaction.get", t, this.wd);
            return this.Td.Af([ n.if ]).then((function(t) {
                if (!t || 1 !== t.length) return d();
                var r = t[0];
                if (r instanceof on) return new Ys(e.wd, n.if, null, 
                /* fromCache= */ !1, 
                /* hasPendingWrites= */ !1, n.rf);
                if (r instanceof rn) return new Ys(e.wd, n.if, r, 
                /* fromCache= */ !1, 
                /* hasPendingWrites= */ !1, n.rf);
                throw d();
            }));
        }, t.prototype.set = function(t, e, n) {
            Fo("Transaction.set", arguments, 2, 3);
            var r = cu("Transaction.set", t, this.wd);
            n = su("Transaction.set", n);
            var i = fu(r.rf, e, n), o = Ns(this.wd.rd, "Transaction.set", r.if, i, null !== r.rf, n);
            return this.Td.set(r.if, o), this;
        }, t.prototype.update = function(t, e, n) {
            for (var r, i, o = [], s = 3; s < arguments.length; s++) o[s - 3] = arguments[s];
            return "string" == typeof e || e instanceof ss ? (Mo("Transaction.update", arguments, 3), 
            r = cu("Transaction.update", t, this.wd), i = Ss(this.wd.rd, "Transaction.update", r.if, e, n, o)) : (qo("Transaction.update", arguments, 2), 
            r = cu("Transaction.update", t, this.wd), i = As(this.wd.rd, "Transaction.update", r.if, e)), 
            this.Td.update(r.if, i), this;
        }, t.prototype.delete = function(t) {
            qo("Transaction.delete", arguments, 1);
            var e = cu("Transaction.delete", t, this.wd);
            return this.Td.delete(e.if), this;
        }, t;
    }(), Ws = /** @class */ function() {
        function t(t) {
            this.wd = t, this.Ed = [], this.Id = !1;
        }
        return t.prototype.set = function(t, e, n) {
            Fo("WriteBatch.set", arguments, 2, 3), this.md();
            var r = cu("WriteBatch.set", t, this.wd);
            n = su("WriteBatch.set", n);
            var i = fu(r.rf, e, n), o = Ns(this.wd.rd, "WriteBatch.set", r.if, i, null !== r.rf, n);
            return this.Ed = this.Ed.concat(o.hf(r.if, Ce.We())), this;
        }, t.prototype.update = function(t, e, n) {
            for (var r, i, o = [], s = 3; s < arguments.length; s++) o[s - 3] = arguments[s];
            return this.md(), "string" == typeof e || e instanceof ss ? (Mo("WriteBatch.update", arguments, 3), 
            r = cu("WriteBatch.update", t, this.wd), i = Ss(this.wd.rd, "WriteBatch.update", r.if, e, n, o)) : (qo("WriteBatch.update", arguments, 2), 
            r = cu("WriteBatch.update", t, this.wd), i = As(this.wd.rd, "WriteBatch.update", r.if, e)), 
            this.Ed = this.Ed.concat(i.hf(r.if, Ce.exists(!0))), this;
        }, t.prototype.delete = function(t) {
            qo("WriteBatch.delete", arguments, 1), this.md();
            var e = cu("WriteBatch.delete", t, this.wd);
            return this.Ed = this.Ed.concat(new Xe(e.if, Ce.We())), this;
        }, t.prototype.commit = function() {
            return this.md(), this.Id = !0, this.Ed.length > 0 ? this.wd.Xf().write(this.Ed) : Promise.resolve();
        }, t.prototype.md = function() {
            if (this.Id) throw new x(D.FAILED_PRECONDITION, "A write batch can no longer be used after commit() has been called.");
        }, t;
    }(), Hs = /** @class */ function(e) {
        function n(t, n, r) {
            var i = this;
            return (i = e.call(this, n.sf, t, r) || this).if = t, i.firestore = n, i.rf = r, 
            i.Zf = i.firestore.Xf(), i;
        }
        return t.__extends(n, e), n._d = function(t, e, r) {
            if (t.length % 2 != 0) throw new x(D.INVALID_ARGUMENT, "Invalid document reference. Document references must have an even number of segments, but " + t.F() + " has " + t.length);
            return new n(new U(t), e, r);
        }, Object.defineProperty(n.prototype, "id", {
            get: function() {
                return this.if.path.S();
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(n.prototype, "parent", {
            get: function() {
                return new ou(this.if.path.p(), this.firestore, this.rf);
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(n.prototype, "path", {
            get: function() {
                return this.if.path.F();
            },
            enumerable: !1,
            configurable: !0
        }), n.prototype.collection = function(t) {
            if (qo("DocumentReference.collection", arguments, 1), Go("DocumentReference.collection", "non-empty string", 1, t), 
            !t) throw new x(D.INVALID_ARGUMENT, "Must provide a non-empty collection name to collection()");
            var e = P.k(t);
            return new ou(this.if.path.child(e), this.firestore, 
            /* converter= */ null);
        }, n.prototype.isEqual = function(t) {
            if (!(t instanceof n)) throw $o("isEqual", "DocumentReference", 1, t);
            return this.firestore === t.firestore && this.if.isEqual(t.if) && this.rf === t.rf;
        }, n.prototype.set = function(t, e) {
            Fo("DocumentReference.set", arguments, 1, 2), e = su("DocumentReference.set", e);
            var n = fu(this.rf, t, e), r = Ns(this.firestore.rd, "DocumentReference.set", this.if, n, null !== this.rf, e);
            return this.Zf.write(r.hf(this.if, Ce.We()));
        }, n.prototype.update = function(t, e) {
            for (var n, r = [], i = 2; i < arguments.length; i++) r[i - 2] = arguments[i];
            return "string" == typeof t || t instanceof ss ? (Mo("DocumentReference.update", arguments, 2), 
            n = Ss(this.firestore.rd, "DocumentReference.update", this.if, t, e, r)) : (qo("DocumentReference.update", arguments, 1), 
            n = As(this.firestore.rd, "DocumentReference.update", this.if, t)), this.Zf.write(n.hf(this.if, Ce.exists(!0)));
        }, n.prototype.delete = function() {
            return qo("DocumentReference.delete", arguments, 0), this.Zf.write([ new Xe(this.if, Ce.We()) ]);
        }, n.prototype.onSnapshot = function() {
            for (var t, e, n, r = this, i = [], o = 0; o < arguments.length; o++) i[o] = arguments[o];
            Fo("DocumentReference.onSnapshot", arguments, 1, 4);
            var s = {
                includeMetadataChanges: !1
            }, u = 0;
            "object" != typeof i[u] || Vo(i[u]) || (Xo("DocumentReference.onSnapshot", s = i[u], [ "includeMetadataChanges" ]), 
            zo("DocumentReference.onSnapshot", "boolean", "includeMetadataChanges", s.includeMetadataChanges), 
            u++);
            var a = {
                includeMetadataChanges: s.includeMetadataChanges
            };
            if (Vo(i[u])) {
                var c = i[u];
                i[u] = null === (t = c.next) || void 0 === t ? void 0 : t.bind(c), i[u + 1] = null === (e = c.error) || void 0 === e ? void 0 : e.bind(c), 
                i[u + 2] = null === (n = c.complete) || void 0 === n ? void 0 : n.bind(c);
            } else Go("DocumentReference.onSnapshot", "function", u, i[u]), jo("DocumentReference.onSnapshot", "function", u + 1, i[u + 1]), 
            jo("DocumentReference.onSnapshot", "function", u + 2, i[u + 2]);
            var h = {
                next: function(t) {
                    i[u] && i[u](r.Ad(t));
                },
                error: i[u + 1],
                complete: i[u + 2]
            };
            return this.Zf.listen(hn(this.if.path), a, h);
        }, n.prototype.get = function(t) {
            var e = this;
            Fo("DocumentReference.get", arguments, 0, 1), au("DocumentReference.get", t);
            var n = this.firestore.Xf();
            return t && "cache" === t.source ? n.kf(this.if).then((function(t) {
                return new Ys(e.firestore, e.if, t, 
                /*fromCache=*/ !0, t instanceof rn && t.Ge, e.rf);
            })) : n.$f(this.if, t).then((function(t) {
                return e.Ad(t);
            }));
        }, n.prototype.withConverter = function(t) {
            return new n(this.if, this.firestore, t);
        }, 
        /**
         * Converts a ViewSnapshot that contains the current document to a
         * DocumentSnapshot.
         */
        n.prototype.Ad = function(t) {
            var e = t.docs.get(this.if);
            return new Ys(this.firestore, this.if, e, t.fromCache, t.hasPendingWrites, this.rf);
        }, n;
    }(ws), Ks = /** @class */ function() {
        function t(t, e) {
            this.hasPendingWrites = t, this.fromCache = e;
        }
        return t.prototype.isEqual = function(t) {
            return this.hasPendingWrites === t.hasPendingWrites && this.fromCache === t.fromCache;
        }, t;
    }(), Ys = /** @class */ function() {
        function t(t, e, n, r, i, o) {
            this.wd = t, this.if = e, this.Rd = n, this.Pd = r, this.gd = i, this.rf = o;
        }
        return t.prototype.data = function(t) {
            var e = this;
            if (Fo("DocumentSnapshot.data", arguments, 0, 1), t = uu("DocumentSnapshot.data", t), 
            this.Rd) {
                // We only want to use the converter and create a new DocumentSnapshot
                // if a converter has been provided.
                if (this.rf) {
                    var n = new Zs(this.wd, this.if, this.Rd, this.Pd, this.gd, 
                    /* converter= */ null);
                    return this.rf.fromFirestore(n, t);
                }
                return new Gs(this.wd.sf, this.wd.fd(), t.serverTimestamps || "none", (function(t) {
                    return new Hs(t, e.wd, /* converter= */ null);
                })).Bf(this.Rd.tn());
            }
        }, t.prototype.get = function(t, e) {
            var n = this;
            if (Fo("DocumentSnapshot.get", arguments, 1, 2), e = uu("DocumentSnapshot.get", e), 
            this.Rd) {
                var r = this.Rd.data().field(Ps("DocumentSnapshot.get", t, this.if));
                if (null !== r) return new Gs(this.wd.sf, this.wd.fd(), e.serverTimestamps || "none", (function(t) {
                    return new Hs(t, n.wd, n.rf);
                })).Bf(r);
            }
        }, Object.defineProperty(t.prototype, "id", {
            get: function() {
                return this.if.path.S();
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "ref", {
            get: function() {
                return new Hs(this.if, this.wd, this.rf);
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "exists", {
            get: function() {
                return null !== this.Rd;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "metadata", {
            get: function() {
                return new Ks(this.gd, this.Pd);
            },
            enumerable: !1,
            configurable: !0
        }), t.prototype.isEqual = function(e) {
            if (!(e instanceof t)) throw $o("isEqual", "DocumentSnapshot", 1, e);
            return this.wd === e.wd && this.Pd === e.Pd && this.if.isEqual(e.if) && (null === this.Rd ? null === e.Rd : this.Rd.isEqual(e.Rd)) && this.rf === e.rf;
        }, t;
    }(), Zs = /** @class */ function(e) {
        function n() {
            return null !== e && e.apply(this, arguments) || this;
        }
        return t.__extends(n, e), n.prototype.data = function(t) {
            return e.prototype.data.call(this, t);
        }, n;
    }(Ys);

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // settings() defaults:
    function Xs(t, e, n, r, i, o, s) {
        var u;
        if (i.M()) {
            if ("array-contains" /* ARRAY_CONTAINS */ === o || "array-contains-any" /* ARRAY_CONTAINS_ANY */ === o) throw new x(D.INVALID_ARGUMENT, "Invalid Query. You can't perform '" + o + "' queries on FieldPath.documentId().");
            if ("in" /* IN */ === o || "not-in" /* NOT_IN */ === o) {
                tu(s, o);
                for (var a = [], c = 0, h = s; c < h.length; c++) {
                    var f = h[c];
                    a.push(Js(r, t, f));
                }
                u = {
                    arrayValue: {
                        values: a
                    }
                };
            } else u = Js(r, t, s);
        } else "in" /* IN */ !== o && "not-in" /* NOT_IN */ !== o && "array-contains-any" /* ARRAY_CONTAINS_ANY */ !== o || tu(s, o), 
        u = Ds(n, e, s, 
        /* allowArrays= */ "in" /* IN */ === o || "not-in" /* NOT_IN */ === o);
        var l = In.create(i, o, u);
        return function(t, e) {
            if (e._n()) {
                var n = t.ln();
                if (null !== n && !n.isEqual(e.field)) throw new x(D.INVALID_ARGUMENT, "Invalid query. All where filters with an inequality (<, <=, >, or >=) must be on the same field. But you have inequality filters on '" + n.toString() + "' and '" + e.field.toString() + "'");
                var r = t.cn();
                null !== r && eu(t, e.field, r);
            }
            var i = t.fn(
            /**
     * Given an operator, returns the set of operators that cannot be used with it.
     *
     * Operators in a query must adhere to the following set of rules:
     * 1. Only one array operator is allowed.
     * 2. Only one disjunctive operator is allowed.
     * 3. NOT_EQUAL cannot be used with another NOT_EQUAL operator.
     * 4. NOT_IN cannot be used with array, disjunctive, or NOT_EQUAL operators.
     *
     * Array operators: ARRAY_CONTAINS, ARRAY_CONTAINS_ANY
     * Disjunctive operators: IN, ARRAY_CONTAINS_ANY, NOT_IN
     */
            function(t) {
                switch (t) {
                  case "!=" /* NOT_EQUAL */ :
                    return [ "!=" /* NOT_EQUAL */ , "not-in" /* NOT_IN */ ];

                  case "array-contains" /* ARRAY_CONTAINS */ :
                    return [ "array-contains" /* ARRAY_CONTAINS */ , "array-contains-any" /* ARRAY_CONTAINS_ANY */ , "not-in" /* NOT_IN */ ];

                  case "in" /* IN */ :
                    return [ "array-contains-any" /* ARRAY_CONTAINS_ANY */ , "in" /* IN */ , "not-in" /* NOT_IN */ ];

                  case "array-contains-any" /* ARRAY_CONTAINS_ANY */ :
                    return [ "array-contains" /* ARRAY_CONTAINS */ , "array-contains-any" /* ARRAY_CONTAINS_ANY */ , "in" /* IN */ , "not-in" /* NOT_IN */ ];

                  case "not-in" /* NOT_IN */ :
                    return [ "array-contains" /* ARRAY_CONTAINS */ , "array-contains-any" /* ARRAY_CONTAINS_ANY */ , "in" /* IN */ , "not-in" /* NOT_IN */ , "!=" /* NOT_EQUAL */ ];

                  default:
                    return [];
                }
            }(e.op));
            if (null !== i) 
            // Special case when it's a duplicate op to give a slightly clearer error message.
            throw i === e.op ? new x(D.INVALID_ARGUMENT, "Invalid query. You cannot use more than one '" + e.op.toString() + "' filter.") : new x(D.INVALID_ARGUMENT, "Invalid query. You cannot use '" + e.op.toString() + "' filters with '" + i.toString() + "' filters.");
        }(t, l), l;
    }

    function $s(t, e, n) {
        if (null !== t.startAt) throw new x(D.INVALID_ARGUMENT, "Invalid query. You must not call startAt() or startAfter() before calling orderBy().");
        if (null !== t.endAt) throw new x(D.INVALID_ARGUMENT, "Invalid query. You must not call endAt() or endBefore() before calling orderBy().");
        var r = new Vn(e, n);
        return function(t, e) {
            if (null === t.cn()) {
                // This is the first order by. It must match any inequality.
                var n = t.ln();
                null !== n && eu(t, n, e.field);
            }
        }(t, r), r
        /**
     * Create a Bound from a query and a document.
     *
     * Note that the Bound will always include the key of the document
     * and so only the provided document will compare equal to the returned
     * position.
     *
     * Will throw if the document does not contain all fields of the order by
     * of the query or if any of the fields in the order by are an uncommitted
     * server timestamp.
     */
        /**
     * Parses the given documentIdValue into a ReferenceValue, throwing
     * appropriate errors if the value is anything other than a DocumentReference
     * or String, or if the string is malformed.
     */;
    }

    function Js(t, e, n) {
        if ("string" == typeof n) {
            if ("" === n) throw new x(D.INVALID_ARGUMENT, "Invalid query. When querying with FieldPath.documentId(), you must provide a valid document ID, but it was an empty string.");
            if (!fn(e) && -1 !== n.indexOf("/")) throw new x(D.INVALID_ARGUMENT, "Invalid query. When querying a collection by FieldPath.documentId(), you must provide a plain document ID, but '" + n + "' contains a '/' character.");
            var r = e.path.child(P.k(n));
            if (!U.j(r)) throw new x(D.INVALID_ARGUMENT, "Invalid query. When querying a collection group by FieldPath.documentId(), the value provided must result in a valid document path, but '" + r + "' is not because it has an odd number of segments (" + r.length + ").");
            return Ct(t, new U(r));
        }
        if (n instanceof ws) return Ct(t, n.if);
        throw new x(D.INVALID_ARGUMENT, "Invalid query. When querying with FieldPath.documentId(), you must provide a valid string or a DocumentReference, but it was: " + Yo(n) + ".");
    }

    /**
     * Validates that the value passed into a disjunctive filter satisfies all
     * array requirements.
     */ function tu(t, e) {
        if (!Array.isArray(t) || 0 === t.length) throw new x(D.INVALID_ARGUMENT, "Invalid Query. A non-empty array is required for '" + e.toString() + "' filters.");
        if (t.length > 10) throw new x(D.INVALID_ARGUMENT, "Invalid Query. '" + e.toString() + "' filters support a maximum of 10 elements in the value array.");
        if ("in" /* IN */ === e || "array-contains-any" /* ARRAY_CONTAINS_ANY */ === e) {
            if (t.indexOf(null) >= 0) throw new x(D.INVALID_ARGUMENT, "Invalid Query. '" + e.toString() + "' filters cannot contain 'null' in the value array.");
            if (t.filter((function(t) {
                return Number.isNaN(t);
            })).length > 0) throw new x(D.INVALID_ARGUMENT, "Invalid Query. '" + e.toString() + "' filters cannot contain 'NaN' in the value array.");
        }
    }

    function eu(t, e, n) {
        if (!n.isEqual(e)) throw new x(D.INVALID_ARGUMENT, "Invalid query. You have a where filter with an inequality (<, <=, >, or >=) on field '" + e.toString() + "' and so you must also use '" + e.toString() + "' as your first orderBy(), but your first orderBy() is on field '" + n.toString() + "' instead.");
    }

    function nu(t) {
        if (t.un() && 0 === t.en.length) throw new x(D.UNIMPLEMENTED, "limitToLast() queries require specifying at least one orderBy() clause");
    }

    var ru = /** @class */ function() {
        function e(t, e, n) {
            this.Vd = t, this.firestore = e, this.rf = n;
        }
        return e.prototype.where = function(t, n, r) {
            // TODO(ne-queries): Add 'not-in' and '!=' to validation.
            var i;
            qo("Query.where", arguments, 3), Zo("Query.where", 3, r), i = "not-in" === n || "!=" === n ? n : Wo("Query.where", [ "<" /* LESS_THAN */ , "<=" /* LESS_THAN_OR_EQUAL */ , "==" /* EQUAL */ , ">=" /* GREATER_THAN_OR_EQUAL */ , ">" /* GREATER_THAN */ , "array-contains" /* ARRAY_CONTAINS */ , "in" /* IN */ , "array-contains-any" /* ARRAY_CONTAINS_ANY */ ], 2, n);
            var o = Ps("Query.where", t), s = Xs(this.Vd, "Query.where", this.firestore.rd, this.firestore.sf, o, i, r);
            return new e(function(t, e) {
                var n = t.filters.concat([ e ]);
                return new an(t.path, t.collectionGroup, t.en.slice(), n, t.limit, t.nn, t.startAt, t.endAt);
            }(this.Vd, s), this.firestore, this.rf);
        }, e.prototype.orderBy = function(t, n) {
            var r;
            if (Fo("Query.orderBy", arguments, 1, 2), jo("Query.orderBy", "non-empty string", 2, n), 
            void 0 === n || "asc" === n) r = "asc" /* ASCENDING */; else {
                if ("desc" !== n) throw new x(D.INVALID_ARGUMENT, "Function Query.orderBy() has unknown direction '" + n + "', expected 'asc' or 'desc'.");
                r = "desc" /* DESCENDING */;
            }
            var i = Ps("Query.orderBy", t), o = $s(this.Vd, i, r);
            return new e(function(t, e) {
                // TODO(dimond): validate that orderBy does not list the same key twice.
                var n = t.en.concat([ e ]);
                return new an(t.path, t.collectionGroup, n, t.filters.slice(), t.limit, t.nn, t.startAt, t.endAt);
            }(this.Vd, o), this.firestore, this.rf);
        }, e.prototype.limit = function(t) {
            return qo("Query.limit", arguments, 1), Go("Query.limit", "number", 1, t), Jo("Query.limit", 1, t), 
            new e(dn(this.Vd, t, "F" /* First */), this.firestore, this.rf);
        }, e.prototype.limitToLast = function(t) {
            return qo("Query.limitToLast", arguments, 1), Go("Query.limitToLast", "number", 1, t), 
            Jo("Query.limitToLast", 1, t), new e(dn(this.Vd, t, "L" /* Last */), this.firestore, this.rf);
        }, e.prototype.startAt = function(t) {
            for (var n = [], r = 1; r < arguments.length; r++) n[r - 1] = arguments[r];
            Mo("Query.startAt", arguments, 1);
            var i = this.yd("Query.startAt", t, n, 
            /*before=*/ !0);
            return new e(yn(this.Vd, i), this.firestore, this.rf);
        }, e.prototype.startAfter = function(t) {
            for (var n = [], r = 1; r < arguments.length; r++) n[r - 1] = arguments[r];
            Mo("Query.startAfter", arguments, 1);
            var i = this.yd("Query.startAfter", t, n, 
            /*before=*/ !1);
            return new e(yn(this.Vd, i), this.firestore, this.rf);
        }, e.prototype.endBefore = function(t) {
            for (var n = [], r = 1; r < arguments.length; r++) n[r - 1] = arguments[r];
            Mo("Query.endBefore", arguments, 1);
            var i = this.yd("Query.endBefore", t, n, 
            /*before=*/ !0);
            return new e(vn(this.Vd, i), this.firestore, this.rf);
        }, e.prototype.endAt = function(t) {
            for (var n = [], r = 1; r < arguments.length; r++) n[r - 1] = arguments[r];
            Mo("Query.endAt", arguments, 1);
            var i = this.yd("Query.endAt", t, n, 
            /*before=*/ !1);
            return new e(vn(this.Vd, i), this.firestore, this.rf);
        }, e.prototype.isEqual = function(t) {
            if (!(t instanceof e)) throw $o("isEqual", "Query", 1, t);
            return this.firestore === t.firestore && gn(this.Vd, t.Vd) && this.rf === t.rf;
        }, e.prototype.withConverter = function(t) {
            return new e(this.Vd, this.firestore, t);
        }, 
        /** Helper function to create a bound from a document or fields */ e.prototype.yd = function(e, n, r, i) {
            if (Zo(e, 1, n), n instanceof Ys) return qo(e, t.__spreadArrays([ n ], r), 1), function(t, e, n, r, i) {
                if (!r) throw new x(D.NOT_FOUND, "Can't use a DocumentSnapshot that doesn't exist for " + n + "().");
                // Because people expect to continue/end a query at the exact document
                // provided, we need to use the implicit sort order rather than the explicit
                // sort order, because it's guaranteed to contain the document key. That way
                // the position becomes unambiguous and the query continues/ends exactly at
                // the provided document. Without the key (by using the explicit sort
                // orders), multiple documents could match the position, yielding duplicate
                // results.
                for (var o = [], s = 0, u = ln(t); s < u.length; s++) {
                    var a = u[s];
                    if (a.field.M()) o.push(Ct(e, r.key)); else {
                        var c = r.field(a.field);
                        if (Nt(c)) throw new x(D.INVALID_ARGUMENT, 'Invalid query. You are trying to start or end a query using a document for which the field "' + a.field + '" is an uncommitted server timestamp. (Since the value of this field is unknown, you cannot start/end a query with it.)');
                        if (null === c) {
                            var h = a.field.F();
                            throw new x(D.INVALID_ARGUMENT, "Invalid query. You are trying to start or end a query using a document for which the field '" + h + "' (used as the orderBy) does not exist.");
                        }
                        o.push(c);
                    }
                }
                return new Ln(o, i);
            }(this.Vd, this.firestore.sf, e, n.Rd, i);
            var o = [ n ].concat(r);
            return function(t, e, n, r, i, o) {
                // Use explicit order by's because it has to match the query the user made
                var s = t.en;
                if (i.length > s.length) throw new x(D.INVALID_ARGUMENT, "Too many arguments provided to " + r + "(). The number of arguments must be less than or equal to the number of orderBy() clauses");
                for (var u = [], a = 0; a < i.length; a++) {
                    var c = i[a];
                    if (s[a].field.M()) {
                        if ("string" != typeof c) throw new x(D.INVALID_ARGUMENT, "Invalid query. Expected a string for document ID in " + r + "(), but got a " + typeof c);
                        if (!fn(t) && -1 !== c.indexOf("/")) throw new x(D.INVALID_ARGUMENT, "Invalid query. When querying a collection and ordering by FieldPath.documentId(), the value passed to " + r + "() must be a plain document ID, but '" + c + "' contains a slash.");
                        var h = t.path.child(P.k(c));
                        if (!U.j(h)) throw new x(D.INVALID_ARGUMENT, "Invalid query. When querying a collection group and ordering by FieldPath.documentId(), the value passed to " + r + "() must result in a valid document path, but '" + h + "' is not because it contains an odd number of segments.");
                        var f = new U(h);
                        u.push(Ct(e, f));
                    } else {
                        var l = Ds(n, r, c);
                        u.push(l);
                    }
                }
                return new Ln(u, o);
            }(this.Vd, this.firestore.sf, this.firestore.rd, e, o, i);
        }, e.prototype.onSnapshot = function() {
            for (var t, e, n, r = this, i = [], o = 0; o < arguments.length; o++) i[o] = arguments[o];
            Fo("Query.onSnapshot", arguments, 1, 4);
            var s = {}, u = 0;
            if ("object" != typeof i[u] || Vo(i[u]) || (Xo("Query.onSnapshot", s = i[u], [ "includeMetadataChanges" ]), 
            zo("Query.onSnapshot", "boolean", "includeMetadataChanges", s.includeMetadataChanges), 
            u++), Vo(i[u])) {
                var a = i[u];
                i[u] = null === (t = a.next) || void 0 === t ? void 0 : t.bind(a), i[u + 1] = null === (e = a.error) || void 0 === e ? void 0 : e.bind(a), 
                i[u + 2] = null === (n = a.complete) || void 0 === n ? void 0 : n.bind(a);
            } else Go("Query.onSnapshot", "function", u, i[u]), jo("Query.onSnapshot", "function", u + 1, i[u + 1]), 
            jo("Query.onSnapshot", "function", u + 2, i[u + 2]);
            var c = {
                next: function(t) {
                    i[u] && i[u](new iu(r.firestore, r.Vd, t, r.rf));
                },
                error: i[u + 1],
                complete: i[u + 2]
            };
            return nu(this.Vd), this.firestore.Xf().listen(this.Vd, s, c);
        }, e.prototype.get = function(t) {
            var e = this;
            Fo("Query.get", arguments, 0, 1), au("Query.get", t), nu(this.Vd);
            var n = this.firestore.Xf();
            return (t && "cache" === t.source ? n.xf(this.Vd) : n.Of(this.Vd, t)).then((function(t) {
                return new iu(e.firestore, e.Vd, t, e.rf);
            }));
        }, e;
    }(), iu = /** @class */ function() {
        function t(t, e, n, r) {
            this.wd = t, this.pd = e, this.bd = n, this.rf = r, this.vd = null, this.Sd = null, 
            this.metadata = new Ks(n.hasPendingWrites, n.fromCache);
        }
        return Object.defineProperty(t.prototype, "docs", {
            get: function() {
                var t = [];
                return this.forEach((function(e) {
                    return t.push(e);
                })), t;
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "empty", {
            get: function() {
                return this.bd.docs._();
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(t.prototype, "size", {
            get: function() {
                return this.bd.docs.size;
            },
            enumerable: !1,
            configurable: !0
        }), t.prototype.forEach = function(t, e) {
            var n = this;
            Fo("QuerySnapshot.forEach", arguments, 1, 2), Go("QuerySnapshot.forEach", "function", 1, t), 
            this.bd.docs.forEach((function(r) {
                t.call(e, n.Dd(r, n.metadata.fromCache, n.bd.qt.has(r.key)));
            }));
        }, Object.defineProperty(t.prototype, "query", {
            get: function() {
                return new ru(this.pd, this.wd, this.rf);
            },
            enumerable: !1,
            configurable: !0
        }), t.prototype.docChanges = function(t) {
            t && (Xo("QuerySnapshot.docChanges", t, [ "includeMetadataChanges" ]), zo("QuerySnapshot.docChanges", "boolean", "includeMetadataChanges", t.includeMetadataChanges));
            var e = !(!t || !t.includeMetadataChanges);
            if (e && this.bd.Ut) throw new x(D.INVALID_ARGUMENT, "To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");
            return this.vd && this.Sd === e || (this.vd = 
            /**
         * Calculates the array of DocumentChanges for a given ViewSnapshot.
         *
         * Exported for testing.
         *
         * @param snapshot The ViewSnapshot that represents the expected state.
         * @param includeMetadataChanges Whether to include metadata changes.
         * @param converter A factory function that returns a QueryDocumentSnapshot.
         * @return An object that matches the DocumentChange API.
         */
            function(t, e, n) {
                if (t.Lt._()) {
                    // Special case the first snapshot because index calculation is easy and
                    // fast
                    var r = 0;
                    return t.docChanges.map((function(e) {
                        var i = n(e.doc, t.fromCache, t.qt.has(e.doc.key));
                        return e.doc, {
                            type: "added",
                            doc: i,
                            oldIndex: -1,
                            newIndex: r++
                        };
                    }));
                }
                // A DocumentSet that is updated incrementally as changes are applied to use
                // to lookup the index of a document.
                var i = t.Lt;
                return t.docChanges.filter((function(t) {
                    return e || 3 /* Metadata */ !== t.type;
                })).map((function(e) {
                    var r = n(e.doc, t.fromCache, t.qt.has(e.doc.key)), o = -1, s = -1;
                    return 0 /* Added */ !== e.type && (o = i.indexOf(e.doc.key), i = i.delete(e.doc.key)), 
                    1 /* Removed */ !== e.type && (s = (i = i.add(e.doc)).indexOf(e.doc.key)), {
                        type: hu(e.type),
                        doc: r,
                        oldIndex: o,
                        newIndex: s
                    };
                }));
            }(this.bd, e, this.Dd.bind(this)), this.Sd = e), this.vd;
        }, 
        /** Check the equality. The call can be very expensive. */ t.prototype.isEqual = function(e) {
            if (!(e instanceof t)) throw $o("isEqual", "QuerySnapshot", 1, e);
            return this.wd === e.wd && gn(this.pd, e.pd) && this.bd.isEqual(e.bd) && this.rf === e.rf;
        }, t.prototype.Dd = function(t, e, n) {
            return new Zs(this.wd, t.key, t, e, n, this.rf);
        }, t;
    }(), ou = /** @class */ function(e) {
        function n(t, n, r) {
            var i = this;
            if ((i = e.call(this, hn(t), n, r) || this).Cd = t, t.length % 2 != 1) throw new x(D.INVALID_ARGUMENT, "Invalid collection reference. Collection references must have an odd number of segments, but " + t.F() + " has " + t.length);
            return i;
        }
        return t.__extends(n, e), Object.defineProperty(n.prototype, "id", {
            get: function() {
                return this.Vd.path.S();
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(n.prototype, "parent", {
            get: function() {
                var t = this.Vd.path.p();
                return t._() ? null : new Hs(new U(t), this.firestore, 
                /* converter= */ null);
            },
            enumerable: !1,
            configurable: !0
        }), Object.defineProperty(n.prototype, "path", {
            get: function() {
                return this.Vd.path.F();
            },
            enumerable: !1,
            configurable: !0
        }), n.prototype.doc = function(t) {
            Fo("CollectionReference.doc", arguments, 0, 1), 
            // We allow omission of 'pathString' but explicitly prohibit passing in both
            // 'undefined' and 'null'.
            0 === arguments.length && (t = m.t()), Go("CollectionReference.doc", "non-empty string", 1, t);
            var e = P.k(t);
            return Hs._d(this.Vd.path.child(e), this.firestore, this.rf);
        }, n.prototype.add = function(t) {
            qo("CollectionReference.add", arguments, 1), Go("CollectionReference.add", "object", 1, this.rf ? this.rf.toFirestore(t) : t);
            var e = this.doc();
            return e.set(t).then((function() {
                return e;
            }));
        }, n.prototype.withConverter = function(t) {
            return new n(this.Cd, this.firestore, t);
        }, n;
    }(ru);

    function su(t, e) {
        if (void 0 === e) return {
            merge: !1
        };
        if (Xo(t, e, [ "merge", "mergeFields" ]), zo(t, "boolean", "merge", e.merge), function(t, e, n, r, i) {
            void 0 !== r && function(t, e, n, r, i) {
                if (!(r instanceof Array)) throw new x(D.INVALID_ARGUMENT, "Function " + t + "() requires its " + e + " option to be an array, but it was: " + Yo(r));
                for (var o = 0; o < r.length; ++o) if (!i(r[o])) throw new x(D.INVALID_ARGUMENT, "Function " + t + "() requires all " + e + " elements to be " + n + ", but the value at index " + o + " was: " + Yo(r[o]));
            }(t, e, n, r, i);
        }(t, "mergeFields", "a string or a FieldPath", e.mergeFields, (function(t) {
            return "string" == typeof t || t instanceof ss;
        })), void 0 !== e.mergeFields && void 0 !== e.merge) throw new x(D.INVALID_ARGUMENT, "Invalid options passed to function " + t + '(): You cannot specify both "merge" and "mergeFields".');
        return e;
    }

    function uu(t, e) {
        return void 0 === e ? {} : (Xo(t, e, [ "serverTimestamps" ]), Qo(t, 0, "serverTimestamps", e.serverTimestamps, [ "estimate", "previous", "none" ]), 
        e);
    }

    function au(t, e) {
        jo(t, "object", 1, e), e && (Xo(t, e, [ "source" ]), Qo(t, 0, "source", e.source, [ "default", "server", "cache" ]));
    }

    function cu(t, e, n) {
        if (e instanceof ws) {
            if (e.firestore !== n) throw new x(D.INVALID_ARGUMENT, "Provided document reference is from a different Firestore instance.");
            return e;
        }
        throw $o(t, "DocumentReference", 1, e);
    }

    function hu(t) {
        switch (t) {
          case 0 /* Added */ :
            return "added";

          case 2 /* Modified */ :
          case 3 /* Metadata */ :
            return "modified";

          case 1 /* Removed */ :
            return "removed";

          default:
            return d();
        }
    }

    /**
     * Converts custom model object of type T into DocumentData by applying the
     * converter if it exists.
     *
     * This function is used when converting user objects to DocumentData
     * because we want to provide the user with a more specific error message if
     * their set() or fails due to invalid data originating from a toFirestore()
     * call.
     */ function fu(t, e, n) {
        // Cast to `any` in order to satisfy the union type constraint on
        // toFirestore().
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return t ? n && (n.merge || n.mergeFields) ? t.toFirestore(e, n) : t.toFirestore(e) : e;
    }

    var lu = {
        Firestore: zs,
        GeoPoint: gs,
        Timestamp: k,
        Blob: is,
        Transaction: Qs,
        WriteBatch: Ws,
        DocumentReference: Hs,
        DocumentSnapshot: Ys,
        Query: ru,
        QueryDocumentSnapshot: Zs,
        QuerySnapshot: iu,
        CollectionReference: ou,
        FieldPath: ss,
        FieldValue: ys,
        setLogLevel: zs.setLogLevel,
        CACHE_SIZE_UNLIMITED: js
    };

    /**
     * Configures Firestore as part of the Firebase SDK by calling registerService.
     *
     * @param firebase The FirebaseNamespace to register Firestore with
     * @param firestoreFactory A factory function that returns a new Firestore
     *    instance.
     */
    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Registers the main Firestore build with the components framework.
     * Persistence can be enabled via `firebase.firestore().enablePersistence()`.
     */ function pu(t) {
        !function(t, e) {
            t.INTERNAL.registerComponent(new o.Component("firestore", (function(t) {
                return function(t, e) {
                    var n = new Oo, r = new Po(n);
                    return new zs(t, e, r, n);
                }(t.getProvider("app").getImmediate(), t.getProvider("auth-internal"));
            }), "PUBLIC" /* PUBLIC */).setServiceProps(Object.assign({}, lu)));
        }(t), t.registerVersion("@firebase/firestore", "1.16.6");
    }

    pu(u.default), exports.__PRIVATE_registerFirestore = pu;

    });

    let firebaseConfig = {
        apiKey: "AIzaSyCRw2kdy58Eh7IQP0JyOuFtN5u9D_VN0bM",
        authDomain: "ejercicio-adsi.firebaseapp.com",
        databaseURL: "https://ejercicio-adsi.firebaseio.com",
        projectId: "ejercicio-adsi",
        storageBucket: "ejercicio-adsi.appspot.com",
        messagingSenderId: "635365645039",
        appId: "1:635365645039:web:a50004ff600aaeb76cd91a"
    };

    index_cjs$3.initializeApp(firebaseConfig);

    const db$1 = index_cjs$3.firestore();

    /* src/App.svelte generated by Svelte v3.24.1 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    // (81:85) {:else}
    function create_else_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Actualizar");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(81:85) {:else}",
    		ctx
    	});

    	return block;
    }

    // (81:55) {#if !task.id.length}
    function create_if_block_1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Guardar");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(81:55) {#if !task.id.length}",
    		ctx
    	});

    	return block;
    }

    // (82:4) {#if task.id}
    function create_if_block(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Cancelar";
    			attr_dev(button, "class", "btn btn-danger");
    			add_location(button, file, 81, 17, 1636);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*handlerCancel*/ ctx[6], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(82:4) {#if task.id}",
    		ctx
    	});

    	return block;
    }

    // (85:3) {#each newTask as task}
    function create_each_block(ctx) {
    	let div;
    	let h3;
    	let t0_value = /*task*/ ctx[2].name + "";
    	let t0;
    	let t1;
    	let p;
    	let t2_value = /*task*/ ctx[2].description + "";
    	let t2;
    	let t3;
    	let button0;
    	let t5;
    	let button1;
    	let t7;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = space();
    			p = element("p");
    			t2 = text(t2_value);
    			t3 = space();
    			button0 = element("button");
    			button0.textContent = "eliminar";
    			t5 = space();
    			button1 = element("button");
    			button1.textContent = "actualizar";
    			t7 = space();
    			attr_dev(h3, "class", "card-title");
    			add_location(h3, file, 86, 5, 1797);
    			attr_dev(p, "class", "card-text");
    			add_location(p, file, 87, 5, 1842);
    			attr_dev(button0, "class", "btn btn-danger mb-2");
    			add_location(button0, file, 88, 5, 1891);
    			attr_dev(button1, "class", "btn btn-primary");
    			add_location(button1, file, 89, 5, 1984);
    			attr_dev(div, "class", "mt-4 card card-body");
    			add_location(div, file, 85, 4, 1758);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h3);
    			append_dev(h3, t0);
    			append_dev(div, t1);
    			append_dev(div, p);
    			append_dev(p, t2);
    			append_dev(div, t3);
    			append_dev(div, button0);
    			append_dev(div, t5);
    			append_dev(div, button1);
    			append_dev(div, t7);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						button0,
    						"click",
    						function () {
    							if (is_function(/*handlerDelete*/ ctx[4](/*task*/ ctx[2].id))) /*handlerDelete*/ ctx[4](/*task*/ ctx[2].id).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						button1,
    						"click",
    						function () {
    							if (is_function(/*handlerUpdate*/ ctx[5](/*task*/ ctx[2]))) /*handlerUpdate*/ ctx[5](/*task*/ ctx[2]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*newTask*/ 2 && t0_value !== (t0_value = /*task*/ ctx[2].name + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*newTask*/ 2 && t2_value !== (t2_value = /*task*/ ctx[2].description + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(85:3) {#each newTask as task}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div4;
    	let div3;
    	let div2;
    	let form;
    	let div0;
    	let input;
    	let t0;
    	let div1;
    	let textarea;
    	let t1;
    	let button;
    	let t2;
    	let t3;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (!/*task*/ ctx[2].id.length) return create_if_block_1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*task*/ ctx[2].id && create_if_block(ctx);
    	let each_value = /*newTask*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			form = element("form");
    			div0 = element("div");
    			input = element("input");
    			t0 = space();
    			div1 = element("div");
    			textarea = element("textarea");
    			t1 = space();
    			button = element("button");
    			if_block0.c();
    			t2 = space();
    			if (if_block1) if_block1.c();
    			t3 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "form-control mb-2");
    			attr_dev(input, "placeholder", "titulo");
    			add_location(input, file, 66, 5, 1184);
    			add_location(div0, file, 65, 4, 1173);
    			attr_dev(textarea, "placeholder", "description");
    			attr_dev(textarea, "class", "form-control mb-2");
    			attr_dev(textarea, "rows", "3");
    			add_location(textarea, file, 74, 5, 1358);
    			add_location(div1, file, 73, 4, 1347);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "btn btn-primary mb-2");
    			add_location(button, file, 80, 4, 1504);
    			attr_dev(form, "class", "card card-body");
    			add_location(form, file, 64, 3, 1098);
    			attr_dev(div2, "class", "col-6");
    			add_location(div2, file, 63, 2, 1075);
    			attr_dev(div3, "class", "row");
    			add_location(div3, file, 62, 1, 1055);
    			attr_dev(div4, "class", "container");
    			add_location(div4, file, 61, 0, 1030);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, form);
    			append_dev(form, div0);
    			append_dev(div0, input);
    			set_input_value(input, /*task*/ ctx[2].name);
    			/*input_binding*/ ctx[8](input);
    			append_dev(form, t0);
    			append_dev(form, div1);
    			append_dev(div1, textarea);
    			set_input_value(textarea, /*task*/ ctx[2].description);
    			append_dev(form, t1);
    			append_dev(form, button);
    			if_block0.m(button, null);
    			append_dev(form, t2);
    			if (if_block1) if_block1.m(form, null);
    			append_dev(div2, t3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[7]),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[9]),
    					listen_dev(form, "submit", prevent_default(/*handlerSubmit*/ ctx[3]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*task*/ 4 && input.value !== /*task*/ ctx[2].name) {
    				set_input_value(input, /*task*/ ctx[2].name);
    			}

    			if (dirty & /*task*/ 4) {
    				set_input_value(textarea, /*task*/ ctx[2].description);
    			}

    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(button, null);
    				}
    			}

    			if (/*task*/ ctx[2].id) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(form, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*handlerUpdate, newTask, handlerDelete*/ 50) {
    				each_value = /*newTask*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div2, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			/*input_binding*/ ctx[8](null);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let task = { id: "", name: "", description: "" };
    	let inputElement;
    	let newTask = [];

    	db$1.collection("task").orderBy("date", "asc").onSnapshot(query => {
    		let docs = [];

    		query.forEach(doc => {
    			docs.push({ ...doc.data(), id: doc.id });
    		});

    		$$invalidate(1, newTask = [...docs]);
    	});

    	const handlerSubmit = async () => {
    		if (task.id.length) {
    			try {
    				await db$1.collection("task").doc(task.id).update({
    					name: task.name,
    					description: task.description
    				});
    			} catch(e) {
    				console.log(e);
    			}
    		} else {
    			try {
    				await db$1.collection("task").doc().set({ ...task, date: new Date() });
    			} catch(e) {
    				console.log(e);
    			}
    		}

    		$$invalidate(2, task = { id: "", name: "", description: "" });
    	};

    	const handlerDelete = async currentId => {
    		await db$1.collection("task").doc(currentId).delete();
    	};

    	const handlerUpdate = data => {
    		$$invalidate(2, task = { ...data });
    	};

    	const handlerCancel = () => {
    		$$invalidate(2, task = { id: "", name: "", description: "" });
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	function input_input_handler() {
    		task.name = this.value;
    		$$invalidate(2, task);
    	}

    	function input_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			inputElement = $$value;
    			$$invalidate(0, inputElement);
    		});
    	}

    	function textarea_input_handler() {
    		task.description = this.value;
    		$$invalidate(2, task);
    	}

    	$$self.$capture_state = () => ({
    		db: db$1,
    		task,
    		inputElement,
    		newTask,
    		handlerSubmit,
    		handlerDelete,
    		handlerUpdate,
    		handlerCancel
    	});

    	$$self.$inject_state = $$props => {
    		if ("task" in $$props) $$invalidate(2, task = $$props.task);
    		if ("inputElement" in $$props) $$invalidate(0, inputElement = $$props.inputElement);
    		if ("newTask" in $$props) $$invalidate(1, newTask = $$props.newTask);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		inputElement,
    		newTask,
    		task,
    		handlerSubmit,
    		handlerDelete,
    		handlerUpdate,
    		handlerCancel,
    		input_input_handler,
    		input_binding,
    		textarea_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
