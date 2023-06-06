
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var ui = (function () {
    'use strict';

    function noop() { }
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
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
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

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
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
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
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
        seen_callbacks.clear();
        set_current_component(saved_component);
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
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
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
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
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
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
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

    function styleInject(css, ref) {
      if ( ref === void 0 ) ref = {};
      var insertAt = ref.insertAt;

      if (!css || typeof document === 'undefined') { return; }

      var head = document.head || document.getElementsByTagName('head')[0];
      var style = document.createElement('style');
      style.type = 'text/css';

      if (insertAt === 'top') {
        if (head.firstChild) {
          head.insertBefore(style, head.firstChild);
        } else {
          head.appendChild(style);
        }
      } else {
        head.appendChild(style);
      }

      if (style.styleSheet) {
        style.styleSheet.cssText = css;
      } else {
        style.appendChild(document.createTextNode(css));
      }
    }

    var css_248z = "/*! tailwindcss v3.3.2 | MIT License | https://tailwindcss.com*/*,:after,:before{border:0 solid #e5e7eb;box-sizing:border-box}:after,:before{--tw-content:\"\"}html{-webkit-text-size-adjust:100%;font-feature-settings:normal;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;font-variation-settings:normal;line-height:1.5;-moz-tab-size:4;-o-tab-size:4;tab-size:4}body{line-height:inherit;margin:0}hr{border-top-width:1px;color:inherit;height:0}abbr:where([title]){-webkit-text-decoration:underline dotted;text-decoration:underline dotted}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;text-decoration:inherit}b,strong{font-weight:bolder}code,kbd,pre,samp{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,Courier New,monospace;font-size:1em}small{font-size:80%}sub,sup{font-size:75%;line-height:0;position:relative;vertical-align:baseline}sub{bottom:-.25em}sup{top:-.5em}table{border-collapse:collapse;border-color:inherit;text-indent:0}button,input,optgroup,select,textarea{color:inherit;font-family:inherit;font-size:100%;font-weight:inherit;line-height:inherit;margin:0;padding:0}button,select{text-transform:none}[type=button],[type=reset],[type=submit],button{-webkit-appearance:button;background-color:transparent;background-image:none}:-moz-focusring{outline:auto}:-moz-ui-invalid{box-shadow:none}progress{vertical-align:baseline}::-webkit-inner-spin-button,::-webkit-outer-spin-button{height:auto}[type=search]{-webkit-appearance:textfield;outline-offset:-2px}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-file-upload-button{-webkit-appearance:button;font:inherit}summary{display:list-item}blockquote,dd,dl,figure,h1,h2,h3,h4,h5,h6,hr,p,pre{margin:0}fieldset{margin:0}fieldset,legend{padding:0}menu,ol,ul{list-style:none;margin:0;padding:0}textarea{resize:vertical}input::-moz-placeholder, textarea::-moz-placeholder{color:#9ca3af;opacity:1}input::placeholder,textarea::placeholder{color:#9ca3af;opacity:1}[role=button],button{cursor:pointer}:disabled{cursor:default}audio,canvas,embed,iframe,img,object,svg,video{display:block;vertical-align:middle}img,video{height:auto;max-width:100%}[hidden]{display:none}*,:after,:before{--tw-border-spacing-x:0;--tw-border-spacing-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgba(59,130,246,.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: }::backdrop{--tw-border-spacing-x:0;--tw-border-spacing-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgba(59,130,246,.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: }.mb-3{margin-bottom:.75rem}.mr-2{margin-right:.5rem}.mt-4{margin-top:1rem}.mt-6{margin-top:1.5rem}.mb-4{margin-bottom:1rem}.mb-6{margin-bottom:1.5rem}.flex{display:flex}.h-screen{height:100vh}.flex-col{flex-direction:column}.items-center{align-items:center}.justify-center{justify-content:center}.p-4{padding:1rem}.text-center{text-align:center}.text-2xl{font-size:1.5rem;line-height:2rem}.text-xs{font-size:.75rem;line-height:1rem}.text-sm{font-size:.875rem;line-height:1.25rem}.font-bold{font-weight:700}.text-gray-400{--tw-text-opacity:1;color:rgb(156 163 175/var(--tw-text-opacity))}.text-gray-600{--tw-text-opacity:1;color:rgb(75 85 99/var(--tw-text-opacity))}.text-gray-700{--tw-text-opacity:1;color:rgb(55 65 81/var(--tw-text-opacity))}";
    styleInject(css_248z);

    /* src/assets/figma-logo.svelte generated by Svelte v3.59.1 */

    function create_fragment$5(ctx) {
    	let svg;
    	let g;
    	let path0;
    	let path1;
    	let path2;
    	let path3;
    	let path4;
    	let defs;
    	let clipPath;
    	let rect;

    	return {
    		c() {
    			svg = svg_element("svg");
    			g = svg_element("g");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			path3 = svg_element("path");
    			path4 = svg_element("path");
    			defs = svg_element("defs");
    			clipPath = svg_element("clipPath");
    			rect = svg_element("rect");
    			attr(path0, "d", "M10.8937 16C10.8937 14.5855 11.4675 13.2289 12.489 12.2288C13.5105 11.2286 14.8959 10.6667 16.3405 10.6667C17.7851 10.6667 19.1705 11.2286 20.192 12.2288C21.2134 13.2289 21.7873 14.5855 21.7873 16C21.7873 17.4145 21.2134 18.771 20.192 19.7712C19.1705 20.7714 17.7851 21.3333 16.3405 21.3333C14.8959 21.3333 13.5105 20.7714 12.489 19.7712C11.4675 18.771 10.8937 17.4145 10.8937 16V16Z");
    			attr(path0, "fill", "#1ABCFE");
    			attr(path1, "d", "M0 26.6667C0 25.2522 0.573858 23.8956 1.59533 22.8954C2.61681 21.8952 4.00222 21.3333 5.44681 21.3333H10.8936V26.6667C10.8936 28.0812 10.3198 29.4377 9.29828 30.4379C8.27681 31.4381 6.89139 32 5.44681 32C4.00222 32 2.61681 31.4381 1.59533 30.4379C0.573858 29.4377 0 28.0812 0 26.6667H0Z");
    			attr(path1, "fill", "#0ACF83");
    			attr(path2, "d", "M10.8937 0V10.6667H16.3405C17.7851 10.6667 19.1705 10.1048 20.192 9.10457C21.2134 8.10438 21.7873 6.74782 21.7873 5.33333C21.7873 3.91885 21.2134 2.56229 20.192 1.5621C19.1705 0.561903 17.7851 0 16.3405 0L10.8937 0Z");
    			attr(path2, "fill", "#FF7262");
    			attr(path3, "d", "M0 5.33333C0 6.74782 0.573858 8.10438 1.59533 9.10457C2.61681 10.1048 4.00222 10.6667 5.44681 10.6667H10.8936V0H5.44681C4.00222 0 2.61681 0.561903 1.59533 1.5621C0.573858 2.56229 0 3.91885 0 5.33333H0Z");
    			attr(path3, "fill", "#F24E1E");
    			attr(path4, "d", "M0 16C0 17.4145 0.573858 18.771 1.59533 19.7712C2.61681 20.7714 4.00222 21.3333 5.44681 21.3333H10.8936V10.6667H5.44681C4.00222 10.6667 2.61681 11.2286 1.59533 12.2288C0.573858 13.2289 0 14.5855 0 16H0Z");
    			attr(path4, "fill", "#A259FF");
    			attr(g, "clip-path", "url(#clip0_1_137)");
    			attr(rect, "width", "21.7872");
    			attr(rect, "height", "32");
    			attr(rect, "fill", "white");
    			attr(clipPath, "id", "clip0_1_137");
    			attr(svg, "width", "32");
    			attr(svg, "height", "32");
    			attr(svg, "viewBox", "0 0 22 32");
    			attr(svg, "fill", "none");
    			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, g);
    			append(g, path0);
    			append(g, path1);
    			append(g, path2);
    			append(g, path3);
    			append(g, path4);
    			append(svg, defs);
    			append(defs, clipPath);
    			append(clipPath, rect);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(svg);
    		}
    	};
    }

    class Figma_logo extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$5, safe_not_equal, {});
    	}
    }

    /* src/assets/svelte-logo.svelte generated by Svelte v3.59.1 */

    function create_fragment$4(ctx) {
    	let svg;
    	let path0;
    	let path1;

    	return {
    		c() {
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			attr(path0, "fill", "#FF3E00");
    			attr(path0, "d", "M239.682 40.707C211.113-.182 154.69-12.301 113.895 13.69L42.247 59.356a82.198 82.198 0 0 0-37.135 55.056a86.566 86.566 0 0 0 8.536 55.576a82.425 82.425 0 0 0-12.296 30.719a87.596 87.596 0 0 0 14.964 66.244c28.574 40.893 84.997 53.007 125.787 27.016l71.648-45.664a82.182 82.182 0 0 0 37.135-55.057a86.601 86.601 0 0 0-8.53-55.577a82.409 82.409 0 0 0 12.29-30.718a87.573 87.573 0 0 0-14.963-66.244");
    			attr(path1, "fill", "#FFF");
    			attr(path1, "d", "M106.889 270.841c-23.102 6.007-47.497-3.036-61.103-22.648a52.685 52.685 0 0 1-9.003-39.85a49.978 49.978 0 0 1 1.713-6.693l1.35-4.115l3.671 2.697a92.447 92.447 0 0 0 28.036 14.007l2.663.808l-.245 2.659a16.067 16.067 0 0 0 2.89 10.656a17.143 17.143 0 0 0 18.397 6.828a15.786 15.786 0 0 0 4.403-1.935l71.67-45.672a14.922 14.922 0 0 0 6.734-9.977a15.923 15.923 0 0 0-2.713-12.011a17.156 17.156 0 0 0-18.404-6.832a15.78 15.78 0 0 0-4.396 1.933l-27.35 17.434a52.298 52.298 0 0 1-14.553 6.391c-23.101 6.007-47.497-3.036-61.101-22.649a52.681 52.681 0 0 1-9.004-39.849a49.428 49.428 0 0 1 22.34-33.114l71.664-45.677a52.218 52.218 0 0 1 14.563-6.398c23.101-6.007 47.497 3.036 61.101 22.648a52.685 52.685 0 0 1 9.004 39.85a50.559 50.559 0 0 1-1.713 6.692l-1.35 4.116l-3.67-2.693a92.373 92.373 0 0 0-28.037-14.013l-2.664-.809l.246-2.658a16.099 16.099 0 0 0-2.89-10.656a17.143 17.143 0 0 0-18.398-6.828a15.786 15.786 0 0 0-4.402 1.935l-71.67 45.674a14.898 14.898 0 0 0-6.73 9.975a15.9 15.9 0 0 0 2.709 12.012a17.156 17.156 0 0 0 18.404 6.832a15.841 15.841 0 0 0 4.402-1.935l27.345-17.427a52.147 52.147 0 0 1 14.552-6.397c23.101-6.006 47.497 3.037 61.102 22.65a52.681 52.681 0 0 1 9.003 39.848a49.453 49.453 0 0 1-22.34 33.12l-71.664 45.673a52.218 52.218 0 0 1-14.563 6.398");
    			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr(svg, "aria-hidden", "true");
    			attr(svg, "role", "img");
    			attr(svg, "class", "iconify iconify--logos");
    			attr(svg, "width", "32");
    			attr(svg, "height", "32");
    			attr(svg, "preserveAspectRatio", "xMidYMid meet");
    			attr(svg, "viewBox", "0 0 256 308");
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, path0);
    			append(svg, path1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(svg);
    		}
    	};
    }

    class Svelte_logo extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$4, safe_not_equal, {});
    	}
    }

    /* src/assets/tailwindcss-logo.svelte generated by Svelte v3.59.1 */

    function create_fragment$3(ctx) {
    	let svg;
    	let g;
    	let path0;
    	let defs;
    	let clipPath;
    	let path1;

    	return {
    		c() {
    			svg = svg_element("svg");
    			g = svg_element("g");
    			path0 = svg_element("path");
    			defs = svg_element("defs");
    			clipPath = svg_element("clipPath");
    			path1 = svg_element("path");
    			attr(path0, "fill", "#38bdf8");
    			attr(path0, "fill-rule", "evenodd");
    			attr(path0, "d", "M27 0c-7.2 0-11.7 3.6-13.5 10.8 2.7-3.6 5.85-4.95 9.45-4.05 2.054.513 3.522 2.004 5.147 3.653C30.744 13.09 33.808 16.2 40.5 16.2c7.2 0 11.7-3.6 13.5-10.8-2.7 3.6-5.85 4.95-9.45 4.05-2.054-.513-3.522-2.004-5.147-3.653C36.756 3.11 33.692 0 27 0zM13.5 16.2C6.3 16.2 1.8 19.8 0 27c2.7-3.6 5.85-4.95 9.45-4.05 2.054.514 3.522 2.004 5.147 3.653C17.244 29.29 20.308 32.4 27 32.4c7.2 0 11.7-3.6 13.5-10.8-2.7 3.6-5.85 4.95-9.45 4.05-2.054-.513-3.522-2.004-5.147-3.653C23.256 19.31 20.192 16.2 13.5 16.2z");
    			attr(path0, "clip-rule", "evenodd");
    			attr(g, "clip-path", "url(#prefix__clip0)");
    			attr(path1, "fill", "#fff");
    			attr(path1, "d", "M0 0h54v32.4H0z");
    			attr(clipPath, "id", "prefix__clip0");
    			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg, "fill", "none");
    			attr(svg, "width", "32");
    			attr(svg, "height", "32");
    			attr(svg, "viewBox", "0 0 54 33");
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, g);
    			append(g, path0);
    			append(svg, defs);
    			append(defs, clipPath);
    			append(clipPath, path1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(svg);
    		}
    	};
    }

    class Tailwindcss_logo extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$3, safe_not_equal, {});
    	}
    }

    /* src/components/Logos.svelte generated by Svelte v3.59.1 */

    function create_fragment$2(ctx) {
    	let main;
    	let div0;
    	let sveltelogo;
    	let t0;
    	let p0;
    	let t2;
    	let div1;
    	let tailwindcsslogo;
    	let t3;
    	let p1;
    	let t5;
    	let div2;
    	let figmalogo;
    	let current;
    	sveltelogo = new Svelte_logo({});
    	tailwindcsslogo = new Tailwindcss_logo({});
    	figmalogo = new Figma_logo({});

    	return {
    		c() {
    			main = element("main");
    			div0 = element("div");
    			create_component(sveltelogo.$$.fragment);
    			t0 = space();
    			p0 = element("p");
    			p0.textContent = "+";
    			t2 = space();
    			div1 = element("div");
    			create_component(tailwindcsslogo.$$.fragment);
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "+";
    			t5 = space();
    			div2 = element("div");
    			create_component(figmalogo.$$.fragment);
    			attr(div0, "class", "mr-2");
    			attr(p0, "class", "mr-2");
    			attr(div1, "class", "mr-2");
    			attr(p1, "class", "mr-2");
    			attr(main, "class", "flex mb-6");
    		},
    		m(target, anchor) {
    			insert(target, main, anchor);
    			append(main, div0);
    			mount_component(sveltelogo, div0, null);
    			append(main, t0);
    			append(main, p0);
    			append(main, t2);
    			append(main, div1);
    			mount_component(tailwindcsslogo, div1, null);
    			append(main, t3);
    			append(main, p1);
    			append(main, t5);
    			append(main, div2);
    			mount_component(figmalogo, div2, null);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(sveltelogo.$$.fragment, local);
    			transition_in(tailwindcsslogo.$$.fragment, local);
    			transition_in(figmalogo.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(sveltelogo.$$.fragment, local);
    			transition_out(tailwindcsslogo.$$.fragment, local);
    			transition_out(figmalogo.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(main);
    			destroy_component(sveltelogo);
    			destroy_component(tailwindcsslogo);
    			destroy_component(figmalogo);
    		}
    	};
    }

    class Logos extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$2, safe_not_equal, {});
    	}
    }

    /* src/components/Footer.svelte generated by Svelte v3.59.1 */

    function create_fragment$1(ctx) {
    	let p;

    	return {
    		c() {
    			p = element("p");
    			p.textContent = "Give me a holler and share what you've built.";
    			attr(p, "class", "text-xs text-gray-400 text-center");
    		},
    		m(target, anchor) {
    			insert(target, p, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(p);
    		}
    	};
    }

    class Footer extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$1, safe_not_equal, {});
    	}
    }

    /* src/UI.svelte generated by Svelte v3.59.1 */

    function create_fragment(ctx) {
    	let main;
    	let div;
    	let h1;
    	let t1;
    	let p;
    	let t3;
    	let logos;
    	let t4;
    	let footer;
    	let current;
    	logos = new Logos({});
    	footer = new Footer({});

    	return {
    		c() {
    			main = element("main");
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Figstail";
    			t1 = space();
    			p = element("p");
    			p.textContent = "A boilerplate temple for building Figma plugins with Svelte and\n            Tailwindcss.";
    			t3 = space();
    			create_component(logos.$$.fragment);
    			t4 = space();
    			create_component(footer.$$.fragment);
    			attr(h1, "class", "text-2xl font-bold mb-4 text-gray-700");
    			attr(p, "class", "mb-4 text-sm text-gray-600 text-center");
    			attr(div, "class", "flex flex-col items-center");
    			attr(main, "class", "flex flex-col h-screen justify-center items-center p-4");
    		},
    		m(target, anchor) {
    			insert(target, main, anchor);
    			append(main, div);
    			append(div, h1);
    			append(div, t1);
    			append(div, p);
    			append(div, t3);
    			mount_component(logos, div, null);
    			append(div, t4);
    			mount_component(footer, div, null);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(logos.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(logos.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(main);
    			destroy_component(logos);
    			destroy_component(footer);
    		}
    	};
    }

    class UI extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment, safe_not_equal, {});
    	}
    }

    const app = new UI({
        target: document.body,
    });

    return app;

})();
