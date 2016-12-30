/**
 * Adapted from yoichi kobayashi's Wriggling sphere - https://codepen.io/ykob/pen/zGpjeK
 * Eli Goberdon - https://github.com/egoberdon
 * Stephen Sorokanich - https://github.com/StephenSorokanich
 */


// setting up blob world
var bodyWidth = document.body.clientWidth;
var bodyHeight = document.body.clientHeight;
var fps = 60;
var lastTimeRender = +new Date();
var canvas;
var renderer;
var scene;
var camera;
var light;
var ball;

//audio

var ctx = new (window.AudioContext || window.webkitAudioContext)(); //webkitAudioContext is for Safari users; ctx is a container for all sound
var buf;
var src;
var analyser = ctx.createAnalyser(); //returns an AnalyserNode, which provides real-time frequency and time-domain analysis information
analyser.smoothingTimeConstant = 1;
var mp3_location = 'davids_synth.mp3';


// Camera Class

var Camera = function() {
    this.width = 0;
    this.height = 0;
    this.rad1 = 0;
    this.rad2 = 0;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.r = 0;
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
    var points = pointSphere(rad1, rad2, this.r);
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

// Misc Functions



// HemiLight class

var HemiLight = function() {
    this.rad1 = 0;
    this.rad2 = 0;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.r = 0;
};

HemiLight.prototype.init = function(scene, rad1, rad2, r, hex1, hex2, intensity) {
    this.r = r;
    this.obj = new THREE.HemisphereLight(hex1, hex2, intensity);
    this.setPosition(rad1, rad2);
    scene.add(this.obj);
};

HemiLight.prototype.setPosition = function(rad1, rad2) {
    var points = pointSphere(rad1, rad2, this.r);
    this.obj.position.set(points[0], points[1], points[2]);
};

// Mesh class

var Mesh = function() {
    this.r = 0;
    this.x = 0;
    this.y = 0;
    this.z = 0;
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
    this.mesh.rotation.set(radian(45), 0,0);

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
        this.vertexDeg[i] = randomInt(0, 360);
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
        r = this.vertexArr[i] + Math.sin(radian(this.vertexDeg[i])) * this.vertexWaveCoe;
        vertices[i].normalize().multiplyScalar(r);
    }
    this.mesh.geometry.computeVertexNormals();
    this.mesh.geometry.computeFaceNormals();
    this.mesh.geometry.verticesNeedUpdate = true;
    this.mesh.geometry.elementsNeedUpdate = true;
    this.mesh.geometry.normalsNeedUpdate = true;
};

// PointLight class

var PointLight = function() {
    this.rad1 = 0;
    this.rad2 = 0;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.r = 0;
};

PointLight.prototype.init = function(scene, rad1, rad2, r, hex, intensity, distance) {
    this.r = r;
    this.obj = new THREE.PointLight(hex, intensity, distance);
    this.setPosition(rad1, rad2);
    scene.add(this.obj);
};

PointLight.prototype.setPosition = function(rad1, rad2) {
    var points = pointSphere(rad1, rad2, this.r);
    this.obj.position.set(points[0], points[1], points[2]);
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

function randomInt(min, max){
    return Math.floor(Math.random() * (max - min)) + min;
}

function degree (radian) {
    return radian / Math.PI * 180;
}

function radian(degrees) {
    return degrees * Math.PI / 180;
}

function pointSphere(rad1, rad2, r) {
    var x = Math.cos(rad1) * Math.cos(rad2) * r;
    var z = Math.cos(rad1) * Math.sin(rad2) * r;
    var y = Math.sin(rad1) * r;
    return [x, y, z];
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
    camera.init(radian(45), radian(0), bodyWidth, bodyHeight);
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
    camera.init(radian(45), radian(0), bodyWidth, bodyHeight);

    light = new HemiLight();
    light.init(scene, radian(0), radian(120), 1000, 0x66ff99, 0x3366aa, 1);

    ball = new Mesh();
    ball.init(scene, ballGeometry, ballMaterial);

    // createText();

    renderloop();
    resizeRenderer();
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
init();