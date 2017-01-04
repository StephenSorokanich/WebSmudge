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
    
    for (var i = 0, l = this.geometry.faces.length; i<l; i++){
        var face = this.geometry.faces[ i ];
		face.materialIndex = Math.floor( Math.random() * this.material.length );
        }
    
    //this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.geometry.sortFacesByMaterialIndex();
    objects = [];
    //this.mesh = new THREE.Mesh(this.geometry, this.material);
    
    
    this.geometry.materials = this.material;
    
    
    this.mesh = new THREE.Mesh(this.geometry, new THREE.MultiMaterial(this.geometry.materials));
    
    this.r = this.geometry.parameters.radius;
    this.vertexWaveCoe = this.r / 30;

    this.geometry.mergeVertices();
    this.updateVerticesInt();
    this.setPosition();
    this.mesh.rotation.set(radian(45), 0,0);

    objects.push(this.mesh)
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
        this.vertexDeg[i] = 45;   //randomInt(0, 360);
        
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
        
                
        var r2 = Math.sqrt(vertices[i]['y']*vertices[i]['y']+vertices[i]['x']*vertices[i]['x']+vertices[i]['z']*vertices[i]['z']);
        var phi = Math.atan2(vertices[i]['y'] , vertices[i]['x']);
        var theta = Math.acos(vertices[i]['z'] / r2);
        this.vertexDeg[i] += 6;
 
        r = this.vertexArr[i] + 
            10*(2-.75*Math.exp(Math.sin(10*phi+Math.cos(2*this.vertexDeg[i]/30)) +
            Math.sin(.5*this.vertexDeg[i]/30)*Math.exp(-Math.cos(10*theta-Math.cos(2.5*this.vertexDeg[i]/30)))));
        
        vertices[i].normalize().multiplyScalar(r);
    }
    this.mesh.geometry.computeVertexNormals();
    this.mesh.geometry.computeFaceNormals();
    this.mesh.geometry.verticesNeedUpdate = true;
    this.mesh.geometry.elementsNeedUpdate = true;
    this.mesh.geometry.normalsNeedUpdate = true;
};


Mesh.prototype.updateVertsAndFaces = function() {
    var vertices = this.mesh.geometry.vertices;
    for (var i = 0; i < this.vertexArr.length; i++) {
        var r;
        
                
        var r2 = Math.sqrt(vertices[i]['y']*vertices[i]['y']+vertices[i]['x']*vertices[i]['x']+vertices[i]['z']*vertices[i]['z']);
        var phi = Math.atan2(vertices[i]['y'] , vertices[i]['x']);
        var theta = Math.acos(vertices[i]['z'] / r2);
        this.vertexDeg[i] += 6;
 
        r = this.vertexArr[i] + 
            10*(2-.75*Math.exp(Math.sin(10*phi+Math.cos(2*this.vertexDeg[i]/30)) +
            Math.sin(.5*this.vertexDeg[i]/30)*Math.exp(-Math.cos(10*theta-Math.cos(2.5*this.vertexDeg[i]/30)))));
        
        vertices[i].normalize().multiplyScalar(r);
    }
    
    //this.material = material;
    //this.mesh.geometry.materials = this.material;
    
    for (var i = 0, l = this.mesh.geometry.faces.length; i<l; i++){
        var face = this.mesh.geometry.faces[ i ];
        var face2 = face.a;
        var face3 = face.b;
        var face4 = face.c;
        var x = .3*(vertices[face2].x+vertices[face3].x+vertices[face4].x);
        var y = .3*(vertices[face2].y+vertices[face3].y+vertices[face4].y);
        var z = .3*(vertices[face2].z+vertices[face3].z+vertices[face4].z);
        var r = Math.sqrt(x*x+y*y+z*z);
        if ( r < 250) {
            face.materialIndex = 0;
        }
        else if ( 250 < r && r< 300 ) {
            face.materialIndex = 1;
        }
        else if ( 300 < r && r< 350) {
            face.materialIndex = 2;
        }
        else {
            face.materialIndex = 3;
        }
		//face.materialIndex = Math.floor( Math.random() * this.material.length );
        }
    
    //this.mesh.geometry.sortFacesByMaterialIndex();
    //objects = [];
    //this.mesh.geometry.materials = this.material;
    //};
    
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
    //this.material = material;
    //ball.updateVertices();
    ball.updateVertsAndFaces();

    renderer.render(scene, camera.obj);
}

function renderloop(){
    var now = +new Date();
    //this.material = material;
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
        alert('Three.js????????????');
    }
    bodyHeight = window.innerHeight;
    bodyWidth = window.innerWidth;
    renderer.setSize(bodyWidth, bodyHeight);
    canvas.appendChild(renderer.domElement);
    renderer.setClearColor(0xfcbd50, 1.0);

    scene = new THREE.Scene();
}

// takes a list of words and places them in the scene
function createText(words){

    var starting_x = -100;
    var starting_z = -100;

    for (var i = 0; i < words.length; i++) {
        textLoader(words[i], starting_x + 100 * i, null, starting_z + 100 * i)

    }

}

function textLoader (word, x, y, z){
    if( !x ) {
        x = 0;
    }

    if( !y ) {
        y = 400;
    }

    if ( !z ) {
        z = 0;
    }

    var loader = new THREE.FontLoader();
    loader.load( 'fonts/Roboto_Slab_Regular.json', function ( font ) {

        var textGeometry = new THREE.TextGeometry( word, {

            font: font,

            size: 50,
            height: 10,
            curveSegments: 12,

            bevelThickness: 1,
            bevelSize: 1,
            bevelEnabled: true

        });

        var textMaterial = new THREE.MeshPhongMaterial(
            { color: 0xe8b2bd, specular: 0xf9c672 }
        );

        var mesh = new THREE.Mesh( textGeometry, textMaterial );

        scene.add( mesh );

        mesh.position.set(x, y, z);
        mesh.rotation.set(0, Math.PI/2, 0);

    });
}

function init() {
    var ballGeometry = new THREE.SphereGeometry(360, 100, 100);
    //var ballMaterial = new THREE.MeshLambertMaterial({
    //    color: 0xffffff,
    //    shading: THREE.FlatShading
    //});
    var ballMaterial = [];
    ballMaterial.push( new THREE.MeshLambertMaterial( { color: 0xffda77, shading: THREE.SmoothShading }));
    ballMaterial.push( new THREE.MeshPhongMaterial( { color: 0xf2e7e3, specular: 0xceccca, shading: THREE.SmoothShading }));
    ballMaterial.push( new THREE.MeshPhongMaterial( { color: 0xf78360, specular: 0xceccca, shading: THREE.SmoothShading }));
    ballMaterial.push( new THREE.MeshPhongMaterial( { color: 0xf99c7f, specular: 0xceccca, shading: THREE.SmoothShading }));
    
    initThree();

    camera = new Camera();
    camera.init(radian(45), radian(0), bodyWidth, bodyHeight);

    light = new HemiLight();
    light.init(scene, radian(0), radian(120), 1000, 0xffffff, 0x515150, 1);

    ball = new Mesh();
    ball.init(scene, ballGeometry, ballMaterial);

    createText(['Hegel', 'Sp(r)ankov', 'Jar Jar Abrams']);

    renderloop();
    resizeRenderer();
}

function loadAudio() {
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

loadAudio();
init();
