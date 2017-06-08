var Flowee = (function() {

'use strict';


/* constants START */
var DIR = {
    S:  [ 1,  0],
    E:  [ 0,  1],
    N:  [-1,  0],
    W:  [ 0, -1]
};

var OBSTACLE = 4;

var KEYCODE = {
    q: 81,
    a: 65,
    z: 90,
    1: 49,
    2: 50,
    3: 51,
    7: 55,
    8: 56,
    9: 57,
    NUM9: 105,
    NUM6: 102,
    NUM3: 99
};

var DEFAULTS = {
    size: 9
};

var PREFIX = 'flowee';

var PLAYER = !0,
    COMPUTER = !1;

/* constants END */


/* helper functions START */
function extend() {
    var obj = {}, i = 0, il = arguments.length, key;
    for (; i < il; i++) {
        for (key in arguments[i]) {
            if (arguments[i].hasOwnProperty(key)) {
                obj[key] = arguments[i][key];
            }
        }
    }
    return obj;
}

function slice(array, start, result) {
    if (!result) result = [];
    for (var i = start || 0; i < array.length; ++i) {
        result.push(array[i]);
    }
    return result;
}

function initMultiArray() {
    var args = slice(arguments);
    if (args.length === 0) {
        return null;
    }
    if (args.length === 1) {
        return new Array(args[0]).fill(0);
    }
    var matrix = new Array(args[0]);
    args.shift();
    for (var i = 0; i < matrix.length; i++) {
        matrix[i] = initMultiArray.apply(this, args);
    }
    return matrix;
}

function cloneDeep(array) {
    return JSON.parse(JSON.stringify(array));
}

function matches(el, selector) {
    if (!el || el === document) { return false; }
    return matchesSelector.call(el, selector);
}

var matchesSelector = Element.prototype.matches || Element.prototype.webkitMatchesSelector ||
    Element.prototype.mozMatchesSelector || Element.prototype.msMatchesSelector ||
    function(s) { return [].indexOf.call(document.querySelectorAll(s), this) !== -1; };

function on(element, type, subselector, callback, context, useCapture) {
    if (Array.isArray(type)) {
        return type.forEach(function(t) {
            on(element, t, subselector, callback, context, useCapture);
        });
    }
    var cb = function(ev) {
        var target = ev.target;
        if (!subselector) {
            return callback.call((context || target), ev, element);
        }
        while (target) {
            if (matches(target, subselector)) {
                return callback.call((context || target), ev, target);
            }
            target = target.parentNode;
        }
    };

    element.addEventListener(type, cb, !!useCapture);
}


// Simple JavaScript Templating
// John Resig - http://ejohn.org/ - MIT Licensed
function template(str, data) {
    return new Function("obj",
        "var p=[],print=function(){p.push.apply(p,arguments);};" +

        // Introduce the data as local variables using with(){}
        "with(obj){p.push('" +

        // Convert the template into pure JavaScript
        str.replace(/[\r\t\n]/g, " ")
           .replace(/'(?=[^%]*%>)/g,"\t")
           .split("'").join("\\'")
           .split("\t").join("'")
           .replace(/<%=(.+?)%>/g, "',$1,'")
           .split("<%").join("');")
           .split("%>").join("p.push('")
           + "');}return p.join('');")(data || {});
}
/* helper functions END */




function Flowee(obj) {

    /* variables START */
    var _EL = document.createElement('div'),
        _OPTIONS = extend(DEFAULTS, obj || {}),
        _SCORE,
        _A,
        _R,
        _HISTORY,
        _IC,
        _JC,
        _ROAD,
        _NEXT,
        _FIRST_TURN,
        _TURN,
        _DISABLE_UI;
    /* variables END */

    var EVENTS = {
        'click [data-undo]': doUndo,
        'click [data-piece]': userAction,
        'click [data-new]': initGame,
        'keydown': keyAction
    };


    /* functions START */
    function init() {
        _SCORE = [0, 0];
        initGame();
    }

    function initGame() {
        _EL.setAttribute('tabindex', '1');
        _EL.focus();
        _EL.classList.add(PREFIX);
        _EL.classList.add(PREFIX + '-' + _OPTIONS.size);
        _EL.classList.remove(PREFIX + '-game-over');

        _A = initMultiArray(_OPTIONS.size, _OPTIONS.size);
        _R = initMultiArray(_OPTIONS.size, _OPTIONS.size);
        _HISTORY = [];

        var obstaclesCount = Math.round(_OPTIONS.size * _OPTIONS.size / 8);
        for (var i = 0; i < obstaclesCount; i++) {
            addObstacle();
        }

        _IC = _JC = 0;
        _ROAD = DIR.S;
        _NEXT = [0, 0];
        _FIRST_TURN = !_FIRST_TURN;
        _TURN = _FIRST_TURN;
        _DISABLE_UI = false;

        addToHistory();

        draw();
    }

    function addToHistory() {
        _HISTORY.push({
            ic: _IC,
            jc: _JC,
            road: _ROAD,
            next: cloneDeep(_NEXT),
            turn: _TURN,
            a: cloneDeep(_A),
            r: cloneDeep(_R),
            score: cloneDeep(_SCORE)
        });
    }

    function doUndo() {
        if (_HISTORY.length < 2) return;

        _DISABLE_UI = false;
        _EL.classList.remove(PREFIX + '-game-over');

        var obj = _HISTORY.pop();

        obj = _HISTORY[_HISTORY.length - 1];
        _IC = obj.ic;
        _JC = obj.jc;
        _ROAD = obj.road;
        _NEXT = cloneDeep(obj.next);
        _TURN = obj.turn;
        _A = cloneDeep(obj.a);
        _R = cloneDeep(obj.r);
        _SCORE = cloneDeep(obj.score);

        draw();
    }

    function addObstacle() {
        var x, y;
        do {
            x = Math.round(Math.random() * (_OPTIONS.size - 3) + 1);
            y = Math.round(Math.random() * (_OPTIONS.size - 3) + 1);
        } while (x === 0 && y === 0);
        _A[x][y] = OBSTACLE;
        _R[x][y] = "full";
    }

    function changeSize(size) {
        if (size < 3 || size > 10) return;
        _OPTIONS.size = size;
    }

    function move(piece) {
        _A[_IC][_JC] = piece;
        _R[_IC][_JC] = cloneDeep(_ROAD);

        _NEXT = setNextPosition(piece);

        _TURN = !_TURN;

        addToHistory();
        draw();
    }

    function keyAction(event, element) {
        event.preventDefault();
        if (_DISABLE_UI) return;

        var piece;
        if (_TURN === PLAYER) {
            switch (event.keyCode) {
                case KEYCODE.q:
                case KEYCODE[1]:
                    piece = 1; break;
                case KEYCODE.a:
                case KEYCODE[2]:
                    piece = 2; break;
                case KEYCODE.z:
                case KEYCODE[3]:
                    piece = 3; break;
            }
        } else {
            switch (event.keyCode) {
                case KEYCODE.NUM9:
                case KEYCODE[7]:
                    piece = 1; break;
                case KEYCODE.NUM6:
                case KEYCODE[8]:
                    piece = 2; break;
                case KEYCODE.NUM3:
                case KEYCODE[9]:
                    piece = 3; break;
            }
        }

        if (!piece) return;
        move(piece);
    }

    function userAction(event, element) {
        event.preventDefault();
        _EL.focus();
        if (_DISABLE_UI) return;

        var piece = +element.getAttribute('data-piece');

        move(piece);
    }

    function setNextPosition(piece) {
        if (piece === 2) {
            if (_ROAD === DIR.S) {
                _ROAD = DIR.W;
            } else if (_ROAD === DIR.E) {
                _ROAD = DIR.N;
            } else if (_ROAD === DIR.N) {
                _ROAD = DIR.E;
            } else if (_ROAD === DIR.W) {
                _ROAD = DIR.S;
            }
        } else if (piece === 3) {
            if (_ROAD === DIR.S) {
                _ROAD = DIR.E;
            } else if (_ROAD === DIR.E) {
                _ROAD = DIR.S;
            } else if (_ROAD === DIR.N) {
                _ROAD = DIR.W;
            } else if (_ROAD === DIR.W) {
                _ROAD = DIR.N;
            }
        }

        _IC += _ROAD[0];
        _JC += _ROAD[1];

        if (_IC >= _OPTIONS.size || _JC >= _OPTIONS.size ||
            _IC < 0 || _JC < 0 || _A[_IC][_JC] === OBSTACLE) {

            gameOver();
            return [];
        }

        if (_A[_IC][_JC] && _A[_IC][_JC] !== OBSTACLE) {
            var oldic = _IC;
            var oldjc = _JC;
            setNextPosition(_A[_IC][_JC]);
            _R[oldic][oldjc] = "full";
            draw();
        }
        return [_IC, _JC];
    }

    function gameOver() {
        _DISABLE_UI = true;
        _SCORE[+_TURN]++;
        _EL.classList.add(PREFIX + '-game-over');
    }

    function getFree() {
        var free = 0;
        for (var i = 0; i < _OPTIONS.size; i++) {
            for (var j = 0; j < _OPTIONS.size; j++) {
                if (!_A[i][j]) free++;
            }
        }
        return free;
    }

    function draw() {
        var i, j, output = '';
        var keys = [
            ['Q', 'A', 'Z'],
            ['NUM 9', 'NUM 6', 'NUM 3']
        ];
        var alt = [
            ['1', '2', '3'],
            ['7', '8', '9']
        ];

        var drawControls = function(active, whichPlayer) {

            // left-controls
            var x = template('<div class="<%= prefix %>-controls">', {
                prefix: PREFIX
            });
            for (var i = 0; i < 3; i++) {
                x += template('<button class="<%= prefix %>-btn <%= prefix %>-column <%= prefix %>-img-<%= index %>-0" data-piece="<%= index %>"<%= disabled %>></button>', {
                    prefix: PREFIX,
                    index: i + 1,
                    disabled: !active ? ' disabled' : ''
                });
            }
            var k = [], j = [];
            for (i = 0; i < 3; i++) {
                k.push("<strong>" + keys[+!whichPlayer][i] + "</strong>");
            }
            for (i = 0; i < 3; i++) {
                j.push("<strong>" + alt[+!whichPlayer][i] + "</strong>");
            }
            x += "<p>" + k.join(" • ") + "<br> or <br>" + j.join(" • ") + '</p>';

            x += '</div>';

            return x;
        };

        output += template('<div class="<%= prefix %>-clearfix">' +
                '<button type="button" class="<%= prefix %>-button <%= prefix %>-left" data-new>New game</button>' +
                '<button type="button" class="<%= prefix %>-button <%= prefix %>-right" data-undo>Undo</button>' +
                '<h1 class="<%= prefix %>-title">Flowee</h1>' +
            '</div>', {
            prefix: PREFIX
        });

        output += template('<div class="<%= prefix %>-clearfix <%= prefix %>-center">' +
                '<span class="<%= prefix %>-score <%= prefix %>-left">ALX: <strong><%= score0 %></strong></span>' +
                '<span class="<%= prefix %>-score <%= prefix %>-right">FLA: <strong><%= score1 %></strong></span>' +
                '<span class="<%= prefix %>-score">FREE: <strong><%= free %></strong></span>' +
            '</div>', {
            prefix: PREFIX,
            score0: _SCORE[0],
            score1: _SCORE[1],
            free: getFree()
        });

        output += drawControls(_TURN === PLAYER, PLAYER);

        // table
        output += template('<div class="<%= prefix %>-table">', { prefix: PREFIX });
        for (i = 0; i < _OPTIONS.size; i++) {
            output += template('<div class="<%= prefix %>-row">', { prefix: PREFIX });
            for (j = 0; j < _OPTIONS.size; j++) {
                var next = _NEXT && _NEXT[0] === i && _NEXT[1] === j ? template(' <%= prefix %>-next', { prefix: PREFIX }) : '';
                var road = _R[i][j].toString().replace(',', '_');
                output += template('<div class="<%= prefix %>-column<%= next %> <%= prefix %>-img-<%= fig %>-<%= road %>"></div>', {
                    prefix: PREFIX,
                    fig: _A[i][j],
                    road: road,
                    next: next
                });
            }
            output += '</div>';
        }
        output += '</div>';

        output += drawControls(_TURN === COMPUTER, COMPUTER);

        _EL.innerHTML = output;
    }

    function bindEvents() {
        for (var key in EVENTS) {
            var s = key.split(/\s+/);
            var eventName = s.shift().trim();
            var eventElement = s.join(' ').trim();
            var callback = EVENTS[key];
            on(_EL, eventName, eventElement, callback, this);
        }
    }

    bindEvents();
    init();

    return {
        el: _EL
    };
}

return Flowee;


})();
