/**
 * Based on yoichi kobayashi's Wriggling sphere - https://codepen.io/ykob/pen/zGpjeK
 * Eli Goberdon - https://github.com/egoberdon
 * Stephen Sorokanich - https://github.com/StephenSorokanich
 */


// setting up blob world
var debounce = require('./debounce');
var Camera = require('./camera');
var PointLight = require('./pointLight');
var HemiLight = require('./hemiLight');
var Mesh = require('./mesh');
var bodyWidth = document.body.clientWidth;
var bodyHeight = document.body.clientHeight;
var fps = 60;
var frameTime;
var lastTimeRender = +new Date();


var canvas;
var renderer;
var scene;
var camera;
var light;
var globe;
var ball;

//audio

var ctx = new (window.AudioContext || window.webkitAudioContext)(); //webkitAudioContext is for Safari users; ctx is a container for all sound
var buf;
var src;
var analyser = ctx.createAnalyser(); //returns an AnalyserNode, which provides real-time frequency and time-domain analysis information
analyser.smoothingTimeConstant = 1;
var mp3_location = 'davids_synth.mp3';

THREE.TrackballControls = function ( object, domElement ) {

    var _this = this;
    var STATE = { NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_ZOOM_PAN: 4 };

    this.object = object;
    this.domElement = ( domElement !== undefined ) ? domElement : document;

    // API

    this.enabled = true;

    this.screen = { left: 0, top: 0, width: 0, height: 0 };

    this.rotateSpeed = 1.0;
    this.zoomSpeed = 1.2;
    this.panSpeed = 0.3;

    this.noRotate = false;
    this.noZoom = false;
    this.noPan = false;

    this.staticMoving = false;
    this.dynamicDampingFactor = 0.2;

    this.minDistance = 0;
    this.maxDistance = Infinity;

    this.keys = [ 65 /*A*/, 83 /*S*/, 68 /*D*/ ];

    // internals

    this.target = new THREE.Vector3();

    var EPS = 0.000001;

    var lastPosition = new THREE.Vector3();

    var _state = STATE.NONE,
        _prevState = STATE.NONE,

        _eye = new THREE.Vector3(),

        _movePrev = new THREE.Vector2(),
        _moveCurr = new THREE.Vector2(),

        _lastAxis = new THREE.Vector3(),
        _lastAngle = 0,

        _zoomStart = new THREE.Vector2(),
        _zoomEnd = new THREE.Vector2(),

        _touchZoomDistanceStart = 0,
        _touchZoomDistanceEnd = 0,

        _panStart = new THREE.Vector2(),
        _panEnd = new THREE.Vector2();

    // for reset

    this.target0 = this.target.clone();
    this.position0 = this.object.position.clone();
    this.up0 = this.object.up.clone();

    // events

    var changeEvent = { type: 'change' };
    var startEvent = { type: 'start' };
    var endEvent = { type: 'end' };


    // methods

    this.handleResize = function () {

        if ( this.domElement === document ) {

            this.screen.left = 0;
            this.screen.top = 0;
            this.screen.width = window.innerWidth;
            this.screen.height = window.innerHeight;

        } else {

            var box = this.domElement.getBoundingClientRect();
            // adjustments come from similar code in the jquery offset() function
            var d = this.domElement.ownerDocument.documentElement;
            this.screen.left = box.left + window.pageXOffset - d.clientLeft;
            this.screen.top = box.top + window.pageYOffset - d.clientTop;
            this.screen.width = box.width;
            this.screen.height = box.height;

        }

    };

    this.handleEvent = function ( event ) {

        if ( typeof this[ event.type ] == 'function' ) {

            this[ event.type ]( event );

        }

    };

    var getMouseOnScreen = ( function () {

        var vector = new THREE.Vector2();

        return function ( pageX, pageY ) {

            vector.set(
                ( pageX - _this.screen.left ) / _this.screen.width,
                ( pageY - _this.screen.top ) / _this.screen.height
            );

            return vector;

        };

    }() );

    var getMouseOnCircle = ( function () {

        var vector = new THREE.Vector2();

        return function ( pageX, pageY ) {

            vector.set(
                ( ( pageX - _this.screen.width * 0.5 - _this.screen.left ) / ( _this.screen.width * 0.5 ) ),
                ( ( _this.screen.height + 2 * ( _this.screen.top - pageY ) ) / _this.screen.width ) // screen.width intentional
            );

            return vector;
        };

    }() );

    this.rotateCamera = (function() {

        var axis = new THREE.Vector3(),
            quaternion = new THREE.Quaternion(),
            eyeDirection = new THREE.Vector3(),
            objectUpDirection = new THREE.Vector3(),
            objectSidewaysDirection = new THREE.Vector3(),
            moveDirection = new THREE.Vector3(),
            angle;

        return function () {

            moveDirection.set( _moveCurr.x - _movePrev.x, _moveCurr.y - _movePrev.y, 0 );
            angle = moveDirection.length();

            if ( angle ) {

                _eye.copy( _this.object.position ).sub( _this.target );

                eyeDirection.copy( _eye ).normalize();
                objectUpDirection.copy( _this.object.up ).normalize();
                objectSidewaysDirection.crossVectors( objectUpDirection, eyeDirection ).normalize();

                objectUpDirection.setLength( _moveCurr.y - _movePrev.y );
                objectSidewaysDirection.setLength( _moveCurr.x - _movePrev.x );

                moveDirection.copy( objectUpDirection.add( objectSidewaysDirection ) );

                axis.crossVectors( moveDirection, _eye ).normalize();

                angle *= _this.rotateSpeed;
                quaternion.setFromAxisAngle( axis, angle );

                _eye.applyQuaternion( quaternion );
                _this.object.up.applyQuaternion( quaternion );

                _lastAxis.copy( axis );
                _lastAngle = angle;

            }

            else if ( !_this.staticMoving && _lastAngle ) {

                _lastAngle *= Math.sqrt( 1.0 - _this.dynamicDampingFactor );
                _eye.copy( _this.object.position ).sub( _this.target );
                quaternion.setFromAxisAngle( _lastAxis, _lastAngle );
                _eye.applyQuaternion( quaternion );
                _this.object.up.applyQuaternion( quaternion );

            }

            _movePrev.copy( _moveCurr );

        };

    }());


    this.zoomCamera = function () {

        var factor;

        if ( _state === STATE.TOUCH_ZOOM_PAN ) {

            factor = _touchZoomDistanceStart / _touchZoomDistanceEnd;
            _touchZoomDistanceStart = _touchZoomDistanceEnd;
            _eye.multiplyScalar( factor );

        } else {

            factor = 1.0 + ( _zoomEnd.y - _zoomStart.y ) * _this.zoomSpeed;

            if ( factor !== 1.0 && factor > 0.0 ) {

                _eye.multiplyScalar( factor );

                if ( _this.staticMoving ) {

                    _zoomStart.copy( _zoomEnd );

                } else {

                    _zoomStart.y += ( _zoomEnd.y - _zoomStart.y ) * this.dynamicDampingFactor;

                }

            }

        }

    };

    this.panCamera = (function() {

        var mouseChange = new THREE.Vector2(),
            objectUp = new THREE.Vector3(),
            pan = new THREE.Vector3();

        return function () {

            mouseChange.copy( _panEnd ).sub( _panStart );

            if ( mouseChange.lengthSq() ) {

                mouseChange.multiplyScalar( _eye.length() * _this.panSpeed );

                pan.copy( _eye ).cross( _this.object.up ).setLength( mouseChange.x );
                pan.add( objectUp.copy( _this.object.up ).setLength( mouseChange.y ) );

                _this.object.position.add( pan );
                _this.target.add( pan );

                if ( _this.staticMoving ) {

                    _panStart.copy( _panEnd );

                } else {

                    _panStart.add( mouseChange.subVectors( _panEnd, _panStart ).multiplyScalar( _this.dynamicDampingFactor ) );

                }

            }
        };

    }());

    this.checkDistances = function () {

        if ( !_this.noZoom || !_this.noPan ) {

            if ( _eye.lengthSq() > _this.maxDistance * _this.maxDistance ) {

                _this.object.position.addVectors( _this.target, _eye.setLength( _this.maxDistance ) );

            }

            if ( _eye.lengthSq() < _this.minDistance * _this.minDistance ) {

                _this.object.position.addVectors( _this.target, _eye.setLength( _this.minDistance ) );

            }

        }

    };

    this.update = function () {

        _eye.subVectors( _this.object.position, _this.target );

        if ( !_this.noRotate ) {

            _this.rotateCamera();

        }

        if ( !_this.noZoom ) {

            _this.zoomCamera();

        }

        if ( !_this.noPan ) {

            _this.panCamera();

        }

        _this.object.position.addVectors( _this.target, _eye );

        _this.checkDistances();

        _this.object.lookAt( _this.target );

        if ( lastPosition.distanceToSquared( _this.object.position ) > EPS ) {

            _this.dispatchEvent( changeEvent );

            lastPosition.copy( _this.object.position );

        }

    };

    this.reset = function () {

        _state = STATE.NONE;
        _prevState = STATE.NONE;

        _this.target.copy( _this.target0 );
        _this.object.position.copy( _this.position0 );
        _this.object.up.copy( _this.up0 );

        _eye.subVectors( _this.object.position, _this.target );

        _this.object.lookAt( _this.target );

        _this.dispatchEvent( changeEvent );

        lastPosition.copy( _this.object.position );

    };

    // listeners

    function keydown( event ) {

        if ( _this.enabled === false ) return;

        window.removeEventListener( 'keydown', keydown );

        _prevState = _state;

        if ( _state !== STATE.NONE ) {

            return;

        } else if ( event.keyCode === _this.keys[ STATE.ROTATE ] && !_this.noRotate ) {

            _state = STATE.ROTATE;

        } else if ( event.keyCode === _this.keys[ STATE.ZOOM ] && !_this.noZoom ) {

            _state = STATE.ZOOM;

        } else if ( event.keyCode === _this.keys[ STATE.PAN ] && !_this.noPan ) {

            _state = STATE.PAN;

        }

    }

    function keyup( event ) {

        if ( _this.enabled === false ) return;

        _state = _prevState;

        window.addEventListener( 'keydown', keydown, false );

    }

    function mousedown( event ) {

        if ( _this.enabled === false ) return;

        event.preventDefault();
        event.stopPropagation();

        if ( _state === STATE.NONE ) {

            _state = event.button;

        }

        if ( _state === STATE.ROTATE && !_this.noRotate ) {

            _moveCurr.copy( getMouseOnCircle( event.pageX, event.pageY ) );
            _movePrev.copy(_moveCurr);

        } else if ( _state === STATE.ZOOM && !_this.noZoom ) {

            _zoomStart.copy( getMouseOnScreen( event.pageX, event.pageY ) );
            _zoomEnd.copy(_zoomStart);

        } else if ( _state === STATE.PAN && !_this.noPan ) {

            _panStart.copy( getMouseOnScreen( event.pageX, event.pageY ) );
            _panEnd.copy(_panStart);

        }

        document.addEventListener( 'mousemove', mousemove, false );
        document.addEventListener( 'mouseup', mouseup, false );

        _this.dispatchEvent( startEvent );

    }

    function mousemove( event ) {

        if ( _this.enabled === false ) return;

        event.preventDefault();
        event.stopPropagation();

        if ( _state === STATE.ROTATE && !_this.noRotate ) {

            _movePrev.copy(_moveCurr);
            _moveCurr.copy( getMouseOnCircle( event.pageX, event.pageY ) );

        } else if ( _state === STATE.ZOOM && !_this.noZoom ) {

            _zoomEnd.copy( getMouseOnScreen( event.pageX, event.pageY ) );

        } else if ( _state === STATE.PAN && !_this.noPan ) {

            _panEnd.copy( getMouseOnScreen( event.pageX, event.pageY ) );

        }

    }

    function mouseup( event ) {

        if ( _this.enabled === false ) return;

        event.preventDefault();
        event.stopPropagation();

        _state = STATE.NONE;

        document.removeEventListener( 'mousemove', mousemove );
        document.removeEventListener( 'mouseup', mouseup );
        _this.dispatchEvent( endEvent );

    }

    function mousewheel( event ) {

        if ( _this.enabled === false ) return;

        event.preventDefault();
        event.stopPropagation();

        var delta = 0;

        if ( event.wheelDelta ) { // WebKit / Opera / Explorer 9

            delta = event.wheelDelta / 40;

        } else if ( event.detail ) { // Firefox

            delta = - event.detail / 3;

        }

        _zoomStart.y += delta * 0.01;
        _this.dispatchEvent( startEvent );
        _this.dispatchEvent( endEvent );

    }

    function touchstart( event ) {

        if ( _this.enabled === false ) return;

        switch ( event.touches.length ) {

            case 1:
                _state = STATE.TOUCH_ROTATE;
                _moveCurr.copy( getMouseOnCircle( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
                _movePrev.copy(_moveCurr);
                break;

            case 2:
                _state = STATE.TOUCH_ZOOM_PAN;
                var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
                var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
                _touchZoomDistanceEnd = _touchZoomDistanceStart = Math.sqrt( dx * dx + dy * dy );

                var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
                var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
                _panStart.copy( getMouseOnScreen( x, y ) );
                _panEnd.copy( _panStart );
                break;

            default:
                _state = STATE.NONE;

        }
        _this.dispatchEvent( startEvent );


    }

    function touchmove( event ) {

        if ( _this.enabled === false ) return;

        event.preventDefault();
        event.stopPropagation();

        switch ( event.touches.length ) {

            case 1:
                _movePrev.copy(_moveCurr);
                _moveCurr.copy( getMouseOnCircle(  event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
                break;

            case 2:
                var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
                var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
                _touchZoomDistanceEnd = Math.sqrt( dx * dx + dy * dy );

                var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
                var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
                _panEnd.copy( getMouseOnScreen( x, y ) );
                break;

            default:
                _state = STATE.NONE;

        }

    }

    function touchend( event ) {

        if ( _this.enabled === false ) return;

        switch ( event.touches.length ) {

            case 1:
                _movePrev.copy(_moveCurr);
                _moveCurr.copy( getMouseOnCircle(  event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
                break;

            case 2:
                _touchZoomDistanceStart = _touchZoomDistanceEnd = 0;

                var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
                var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
                _panEnd.copy( getMouseOnScreen( x, y ) );
                _panStart.copy( _panEnd );
                break;

        }

        _state = STATE.NONE;
        _this.dispatchEvent( endEvent );

    }

    this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );

    this.domElement.addEventListener( 'mousedown', mousedown, false );

    this.domElement.addEventListener( 'mousewheel', mousewheel, false );
    this.domElement.addEventListener( 'DOMMouseScroll', mousewheel, false ); // firefox

    this.domElement.addEventListener( 'touchstart', touchstart, false );
    this.domElement.addEventListener( 'touchend', touchend, false );
    this.domElement.addEventListener( 'touchmove', touchmove, false );

    window.addEventListener( 'keydown', keydown, false );
    window.addEventListener( 'keyup', keyup, false );

    this.handleResize();

    // force an update at start
    this.update();

};

THREE.TrackballControls.prototype = Object.create( THREE.EventDispatcher.prototype );
THREE.TrackballControls.prototype.constructor = THREE.TrackballControls;

        var Camera = function() {
            this.width = 0;
            this.height = 0;
            this.rad1 = 0;
            this.rad2 = 0;
            this.x = 0;
            this.y = 0;
            this.z = 0;
            this.r = 0;
            this.obj;
            this.trackball;
        };

        Camera.prototype.init = function(rad1, rad2, width, height) {
            this.width = width;
            this.height = height;
            this.r = 1200;
            this.rad1 = rad1;
            this.rad2 = rad2;
            this.obj = new THREE.PerspectiveCamera(50, this.width / this.height, 1, 10000);
            this.setPosition(this.rad1, this.rad2, this.r);
            this.initTrackBall();
        };

        Camera.prototype.setPosition = function(rad1, rad2) {
            var points = get.pointSphere(rad1, rad2, this.r);
            this.obj.position.set(points[0], points[1], points[2]);
            this.obj.up.set(0, 1, 0);
            this.obj.lookAt({
                x: 0,
                y: 0,
                z: 0
            });
        };

        Camera.prototype.initTrackBall = function() {
            this.trackball = new THREE.TrackballControls(this.obj, this.canvas);
            this.trackball.screen.width = this.width;
            this.trackball.screen.height = this.height;
            this.trackball.noRotate = false;
            this.trackball.rotateSpeed = 3;
            this.trackball.noZoom = true;
            this.trackball.zoomSpeed = 1;
            this.trackball.noPan = false;
            this.trackball.maxDistance = 3000;
            this.trackball.minDistance = 500;
        };

        var timer;

        object.addEventListener(eventType, function(event) {
            clearTimeout(timer);
            timer = setTimeout(function(){
                callback(event);
            }, 500);
        }, false);

    var exports = function(){
        var Get = function() {};

        Get.prototype.randomInt = function(min, max){
            return Math.floor(Math.random() * (max - min)) + min;
        };

        Get.prototype.degree = function(radian) {
            return radian / Math.PI * 180;
        };

        Get.prototype.radian = function(degrees) {
            return degrees * Math.PI / 180;
        };

        Get.prototype.pointSphere = function(rad1, rad2, r) {
            var x = Math.cos(rad1) * Math.cos(rad2) * r;
            var z = Math.cos(rad1) * Math.sin(rad2) * r;
            var y = Math.sin(rad1) * r;
            return [x, y, z];
        };

        return Get;
    };

    var exports = function(){
        var HemiLight = function() {
            this.rad1 = 0;
            this.rad2 = 0;
            this.x = 0;
            this.y = 0;
            this.z = 0;
            this.r = 0;
            this.obj;
        };

        HemiLight.prototype.init = function(scene, rad1, rad2, r, hex1, hex2, intensity) {
            this.r = r;
            this.obj = new THREE.HemisphereLight(hex1, hex2, intensity);
            this.setPosition(rad1, rad2);
            scene.add(this.obj);
        };

        HemiLight.prototype.setPosition = function(rad1, rad2) {
            var points = get.pointSphere(rad1, rad2, this.r);
            this.obj.position.set(points[0], points[1], points[2]);
        };

        return HemiLight;
    };

    var exports = function() {
        var Mesh = function() {
            this.r = 0;
            this.x = 0;
            this.y = 0;
            this.z = 0;
            this.geometry;
            this.material;
            this.mesh;
            this.vertexArr = [];
            this.vertexDeg = [];
            this.vertexWaveCoe = 0;
        };

        Mesh.prototype.init = function(scene, geometry, material) {
            this.geometry = geometry;
            this.material = material;
            this.mesh = new THREE.Mesh(this.geometry, this.material);
            this.r = this.geometry.parameters.radius;
            this.vertexWaveCoe = this.r / 30;

            this.geometry.mergeVertices();
            this.updateVerticesInt();
            this.setPosition();
            this.mesh.rotation.set(Math.radian(45), 0,0);

            scene.add(this.mesh);
        };

        Mesh.prototype.setPosition = function() {
            this.mesh.position.set(this.x, this.y, this.z);
        };

        Mesh.prototype.updateVerticesInt = function() {
            var vertices = this.mesh.geometry.vertices;
            for (var i = 0; i < vertices.length; i++) {
                var r = this.r;
                this.vertexArr[i] = r;
                this.vertexDeg[i] = get.randomInt(0, 360);
                vertices[i].normalize().multiplyScalar(r);
            }
            this.mesh.geometry.computeVertexNormals();
            this.mesh.geometry.computeFaceNormals();
            this.mesh.geometry.verticesNeedUpdate = true;
            this.mesh.geometry.elementsNeedUpdate = true;
            this.mesh.geometry.normalsNeedUpdate = true;
        };

        Mesh.prototype.updateVertices = function() {
            var vertices = this.mesh.geometry.vertices;
            for (var i = 0; i < this.vertexArr.length; i++) {
                var r;
                this.vertexDeg[i] += 8;
                r = this.vertexArr[i] + Math.sin(Math.radian(this.vertexDeg[i])) * this.vertexWaveCoe;
                vertices[i].normalize().multiplyScalar(r);
            }
            this.mesh.geometry.computeVertexNormals();
            this.mesh.geometry.computeFaceNormals();
            this.mesh.geometry.verticesNeedUpdate = true;
            this.mesh.geometry.elementsNeedUpdate = true;
            this.mesh.geometry.normalsNeedUpdate = true;
        };

        return Mesh;
    };


    var exports = function(){
        var PointLight = function() {
            this.rad1 = 0;
            this.rad2 = 0;
            this.x = 0;
            this.y = 0;
            this.z = 0;
            this.r = 0;
            this.obj;
        };

        PointLight.prototype.init = function(scene, rad1, rad2, r, hex, intensity, distance) {
            this.r = r;
            this.obj = new THREE.PointLight(hex, intensity, distance);
            this.setPosition(rad1, rad2);
            scene.add(this.obj);
        };

        PointLight.prototype.setPosition = function(rad1, rad2) {
            var points = get.pointSphere(rad1, rad2, this.r);
            this.obj.position.set(points[0], points[1], points[2]);
        };

        return PointLight;
    };


function createText() {
    // add 3D text
    materialFront = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
    materialSide = new THREE.MeshBasicMaterial( { color: 0x000088 } );
    materialArray = [ materialFront, materialSide ];
    textParams = {
        size: 30, height: 4, curveSegments: 3,
        font: "helvetiker", weight: "bold", style: "normal",
        bevelThickness: 1, bevelSize: 2, bevelEnabled: true,
        material: 0, extrudeMaterial: 1
    };
    textGeom = new THREE.TextGeometry( "Hegel", textParams);

    textMaterial = new THREE.MeshFaceMaterial(materialArray);
    textMesh = new THREE.Mesh(textGeom, textMaterial );

    textGeom.computeBoundingBox();
    textWidth = textGeom.boundingBox.max.x - textGeom.boundingBox.min.x;
    textMesh.position.set(-400, 150, 0);
    textMesh.rotation.x = -Math.PI / 4;
    scene.add(textMesh);
}

function render() {
    renderer.clear();

    ball.updateVertices();

    renderer.render(scene, camera.obj);
}

function renderloop(){
    var now = +new Date();
    requestAnimationFrame(renderloop);

    if (now - lastTimeRender > 1000 / fps) {
        render();
        lastTimeRender = +new Date();
    }
    camera.trackball.update();
}

function resizeRenderer() {
    bodyWidth  = document.body.clientWidth;
    bodyHeight = document.body.clientHeight;
    renderer.setSize(bodyWidth, bodyHeight);
    camera.init(Math.radian(45), Math.radian(0), bodyWidth, bodyHeight);
}

function initThree() {
    canvas = document.getElementById('canvas');
    renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    if (!renderer) {
        alert('Three.jsの初期化に失敗しました。');
    }
    bodyHeight = window.innerHeight;
    bodyWidth = window.innerWidth;
    renderer.setSize(bodyWidth, bodyHeight);
    canvas.appendChild(renderer.domElement);
    renderer.setClearColor(0xfcbd50, 1.0);

    scene = new THREE.Scene();
}

function init() {
    var ballGeometry = new THREE.SphereGeometry(360, 20, 20);
    var ballMaterial = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        shading: THREE.FlatShading
    });

    initThree();

    camera = new Camera();
    camera.init(Math.radian(45), Math.radian(0), bodyWidth, bodyHeight);

    light = new HemiLight();
    light.init(scene, Math.radian(0), Math.radian(120), 1000, 0x66ff99, 0x3366aa, 1);

    ball = new Mesh();
    ball.init(scene, ballGeometry, ballMaterial);

    // createText();

    renderloop();
    debounce(window, 'resize', function(event){
        resizeRenderer();
    });
}

function loadFile() {
    var req = new XMLHttpRequest();
    req.open("GET",mp3_location,true);
    req.responseType = "arraybuffer";
    req.onload = function() {
        //decode the loaded data
        ctx.decodeAudioData(req.response, function(buffer) {
            buf = buffer; //the ArrayBuffer is converted to an AudioBuffer, which holds our audio data in memory
            play();
        });
    };
    req.send();
}

function play() {
    //create a source node from the buffer (type: AudioBufferSourceNode)
    src = ctx.createBufferSource(); //src is the "record player"

    src.buffer = buf; //src.buffer is the "record"
    src.loop = true;

    //connect to the final output node (the speakers)
    src.connect(analyser); //connect the record player to the AnalyserNode (where real-time data is)

    analyser.connect(ctx.destination); //ctx.destination is the speakers
    //play immediately
    src.start();
}

loadFile();