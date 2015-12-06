// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
// MIT license
(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }
    if (!window.requestAnimationFrame) window.requestAnimationFrame = function(callback, element) {
        var currTime = new Date().getTime();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = window.setTimeout(function() {
            callback(currTime + timeToCall);
        }, timeToCall);
        lastTime = currTime + timeToCall;
        return id;
    };
    if (!window.cancelAnimationFrame) window.cancelAnimationFrame = function(id) {
        clearTimeout(id);
    };
}());

// Jazz Animation Framework,
// no rely, simple api but powerful

(function(global, factory) {

    if (typeof module === "object" && typeof module.exports === "object") {
        // For CommonJS and CommonJS-like environments where a proper `window`
        // is present, execute the factory and get avalon.
        // For environments that do not have a `window` with a `document`
        // (such as Node.js), expose a factory as module.exports.
        // This accentuates the need for the creation of a real `window`.
        module.exports = global.document ? factory(global, true) : function(w) {
            return factory(w)
        }
    } else {
        factory(global)
    }

// Pass this if window is not defined yet
}(typeof window !== "undefined" ? window : this, function(window, noGlobal){

    var DOC = window.document;
    var head = DOC.getElementsByTagName("head")[0];
    var _version = "0.1.0";

    var default_settings = {
        speed : 4,
        duration : 1000
    };

    var nextTick = new function () {
        var tickImmediate = window.setImmediate;
        var tickObserver = window.MutationObserver;
        if (tickImmediate) {//IE10 \11 edge
            return tickImmediate.bind(window)
        }

        var queue = [];
        function callback() {
            var n = queue.length;
            for (var i = 0; i < n; i++) {
                queue[i]()
            }
            queue = queue.slice( n )
        }

        if (tickObserver) {// 支持MutationObserver
            var node = document.createTextNode("Jazz");
            new tickObserver(callback).observe(node, {characterData: true});
            return function (fn) {
                queue.push(fn);
                node.data = Math.random();
            }
        }

        if (window.VBArray) {
            return function (fn) {
                queue.push(fn);
                var node = DOC.createElement("script");
                node.onreadystatechange = function () {
                    callback(); //在interactive阶段就触发
                    node.onreadystatechange = null;
                    head.removeChild(node);
                    node = null
                };
                head.appendChild(node)
            }
        }
        return function (fn) {
            setTimeout(fn, 4)
        }
    };

    var Jazz = function ( el ){
        return new Jazz.fn.init( el );
    };

    //插件
    Jazz.plugins = plugins;
    //执行插件
    Jazz.run = run;
    //移动到某一点
    Jazz.move = move;
    //停止某一插件
    Jazz.stop = stop;
    //延迟插件执行
    Jazz.delay = delay;
    //交替某一插件
    Jazz.toogle = toggle;
    //结束运动
    Jazz.end = end;

    //prototype
    Jazz.fn = Jazz.prototype = {
        version : _version,
        constructor : Jazz,
        run : run,
        stop : stop,
        move : move,
        delay : delay,
        toggle : toggle,
        end : end
    };

    var ps = PubSub();

    var init = Jazz.fn.init = function ( el ){
        Jazz.el = this[0] = this.el = el;
        //创建一个新的动画队列
        Jazz.queue = $Queue();
        //操作方式
        var elementPosition = getStyle( el, "position" );
        if( elementPosition == "absolute" || elementPosition == "fixed" ){
            Jazz.x = Jazz.oX = "left";
            Jazz.y = Jazz.oY = "top";
        } else {
            Jazz.x = "marginLeft";
            Jazz.y = "marginTop";
            Jazz.oX = "offsetLeft";
            Jazz.oY = "offsetTop";
        }
        return this;
    };

    init.prototype = Jazz.fn;

    //所有运动效果通过插件方式
    function plugins ( name, callback ){
        return ps.bind( name, function (){
            callback.call( Jazz, arguments )
        });
    }

    function run( name ){
        return ps.trigger( name );
    }

    function stop ( name ){
    }

    function sGetPos ( number ){
        return number == "auto" ? 0 : parseFloat( number );
    }

    function _move ( x, y, callback ){

        var startTime = +new Date();
        var timer = null;
        var animatePs = new PubSub();

        animatePs.one('end', function (){
            continues = null;
            cancelAnimationFrame( timer );
            return callback && callback();
        });

        function continues (){

            var now = +new Date();

            if( now - startTime >= default_settings.duration ) {
                animatePs.trigger("end");
            }

            var cx = sGetPos(getStyle(Jazz.el, Jazz.oX)),
                cy = sGetPos(getStyle(Jazz.el, Jazz.oY));

            timer = requestAnimationFrame(function (){
                Jazz.el.style[Jazz.x] = cx + parseFloat(x / (default_settings.duration / 4)) + 'px';
                continues && continues();
            });
        }

        return continues();
    }

    function move ( x, y ){
        Jazz.queue().$set(function ( callback ){
            return _move( x, y, callback );
        });
        return this;
    }

    function delay (){

    }

    function toggle (){

    }

    function end (){
        var nextAni = Jazz.queue().$get();
        if( nextAni && typeof nextAni === "function" ){
            nextAni(function (){
                return nextTick(end);
            });
        }
    }

    function addEffect ( fn ){
        var _fn = fn && typeof fn == "function" && fn();
        requestAnimationFrame( addEffect );
    }

    function removeEffect (){

    }

    function getStyle(elem,styleName){
        if(elem.style[styleName]){//内联样式
            return elem.style[styleName];
        }
        else if(elem.currentStyle){//IE
            return elem.currentStyle[styleName];
        }
        else if(document.defaultView && document.defaultView.getComputedStyle){//DOM
            styleName = styleName.replace(/([A-Z])/g,'-$1').toLowerCase();
            var s = document.defaultView.getComputedStyle(elem,'');
            return s&&s.getPropertyValue(styleName);
        }
        else{//other,for example, Safari
            return null;
        }
    }

    function PubSub (){
        var bind,
            unbind,
            one,
            trigger,
            collections,
            self;

        collections = {};
        self = this;

        bind = function ( key, fn ){
            var stack, _ref;
            stack = ( _ref = collections[key] ) === undefined ? (collections[ key ] = []) : _ref;
            return stack.push( fn );
        };

        unbind = function ( key ){
            var _ref;
            return ( _ref = collections[key] ) === undefined ? undefined : _ref.length = 0;
        };

        one = function ( key, fn ){
            unbind(key);
            bind( key, fn );
        };

        trigger = function (){
            var fn, stack, _i, _len, _ref, key;
            key = Array.prototype.shift.call( arguments );
            stack = ( _ref = collections[ key ] ) === undefined ? ( collections[ key ] = [] ) : _ref;
            for ( _i = 0, _len = stack.length; _i < _len; _i++ ) {
                fn = stack[ _i ];
                if ( fn.apply( self, arguments ) === false) {
                    return false;
                }
            }
        };

        return {
            bind: bind,
            one: one,
            unbind: unbind,
            trigger: trigger
        }
    }

    function $Queue (){
        var QueueStack = [];
        return function (){
            return {
                $set : function ( callback ){
                    return QueueStack.push( callback );
                },
                $get : function (){
                    return QueueStack.shift();
                },
                $clear : function (){
                    QueueStack = [];
                    QueueStack.length = 0;
                    return null;
                }
            }
        }
    }

    // Register as a named AMD module, since avalon can be concatenated with other
    // files that may use define, but not via a proper concatenation script that
    // understands anonymous AMD modules. A named AMD is safest and most robust
    // way to register. Lowercase avalon is used because AMD module names are
    // derived from file names, and Avalon is normally delivered in a lowercase
    // file name. Do this after creating the global so that if an AMD module wants
    // to call noConflict to hide this version of avalon, it will work.

    // Note that for maximum portability, libraries that are not avalon should
    // declare themselves as anonymous modules, and avoid setting a global if an
    // AMD loader is present. avalon is a special case. For more information, see
    // https://github.com/jrburke/requirejs/wiki/Updating-existing-libraries#wiki-anon
    if (typeof define === "function" && define.amd) {
        define("Jazz", [], function() {
            return Jazz;
        })
    }

    if ( noGlobal === void 0 ){
        window.Jazz = Jazz;
    }

    return Jazz;

}));


