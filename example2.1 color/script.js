// Import libraries
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.126.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.126.0/examples/jsm/controls/OrbitControls.js";
import rhino3dm from "https://cdn.jsdelivr.net/npm/rhino3dm@7.11.1/rhino3dm.module.js";
import { RhinoCompute } from "https://cdn.jsdelivr.net/npm/compute-rhino3d@0.13.0-beta/compute.rhino3d.module.js";
import { Rhino3dmLoader } from "https://cdn.jsdelivr.net/npm/three@0.124.0/examples/jsm/loaders/3DMLoader.js";

const definitionName = "Tensegrity_SimpleExample.gh";

// Set up sliders
const radius_slider = document.getElementById("Radius");
radius_slider.addEventListener("mouseup", onSliderChange, false);
radius_slider.addEventListener("touchend", onSliderChange, false);

const segments_slider = document.getElementById("Segments");
segments_slider.addEventListener("mouseup", onSliderChange, false);
segments_slider.addEventListener("touchend", onSliderChange, false);

const height_slider = document.getElementById("Height");
height_slider.addEventListener("mouseup", onSliderChange, false);
height_slider.addEventListener("touchend", onSliderChange, false);

const compress_slider = document.getElementById("Compress");
compress_slider.addEventListener("mouseup", onSliderChange, false);
compress_slider.addEventListener("touchend", onSliderChange, false);

const expands_slider = document.getElementById("Expands");
expands_slider.addEventListener("mouseup", onSliderChange, false);
expands_slider.addEventListener("touchend", onSliderChange, false);

const sthickness_slider = document.getElementById("Sthickness");
sthickness_slider.addEventListener("mouseup", onSliderChange, false);
sthickness_slider.addEventListener("touchend", onSliderChange, false);

const loader = new Rhino3dmLoader();
loader.setLibraryPath("https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/");

let rhino, definition, doc;
rhino3dm().then(async (m) => {
  console.log("Loaded rhino3dm.");
  rhino = m; // global

  //RhinoCompute.url = getAuth( 'RHINO_COMPUTE_URL' ) // RhinoCompute server url. Use http://localhost:8081 if debugging locally.
  //RhinoCompute.apiKey = getAuth( 'RHINO_COMPUTE_KEY' )  // RhinoCompute server api key. Leave blank if debugging locally.

  RhinoCompute.url = "http://localhost:8081/"; //if debugging locally.

  // load a grasshopper file!

  const url = definitionName;
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  const arr = new Uint8Array(buffer);
  definition = arr;

  init();
  compute();
});

async function compute() {
  const param1 = new RhinoCompute.Grasshopper.DataTree("Radius");
  param1.append([0], [radius_slider.valueAsNumber]);

  const param2 = new RhinoCompute.Grasshopper.DataTree("Segments");
  param2.append([0], [segments_slider.valueAsNumber]);

  const param3 = new RhinoCompute.Grasshopper.DataTree("Height");
  param3.append([0], [height_slider.valueAsNumber]);

  const param4 = new RhinoCompute.Grasshopper.DataTree("Compress");
  param4.append([0], [compress_slider.valueAsNumber]);

  const param5 = new RhinoCompute.Grasshopper.DataTree("Expands");
  param5.append([0], [expands_slider.valueAsNumber]);

  const param6 = new RhinoCompute.Grasshopper.DataTree("Sthickness");
  param6.append([0], [sthickness_slider.valueAsNumber]);

  // clear values
  const trees = [];
  trees.push(param1);
  trees.push(param2);
  trees.push(param3);
  trees.push(param4);
  trees.push(param5);
  trees.push(param6);

  const res = await RhinoCompute.Grasshopper.evaluateDefinition(
    definition,
    trees
  );

  console.log(res);

  doc = new rhino.File3dm();

  // hide spinner
  document.getElementById("loader").style.display = "none";

  //decode grasshopper objects and put them into a rhino document
  for (let i = 0; i < res.values.length; i++) {
    for (const [key, value] of Object.entries(res.values[i].InnerTree)) {
      for (const d of value) {
        const data = JSON.parse(d.data);
        const rhinoObject = rhino.CommonObject.decode(data);
        doc.objects().add(rhinoObject, null);
      }
    }
  }



  // go through the objects in the Rhino document

  let objects = doc.objects();
  for ( let i = 0; i < objects.count; i++ ) {
  
    const rhinoObject = objects.get( i );


     // asign geometry userstrings to object attributes
    if ( rhinoObject.geometry().userStringCount > 0 ) {
      const g_userStrings = rhinoObject.geometry().getUserStrings()
      rhinoObject.attributes().setUserString(g_userStrings[0][0], g_userStrings[0][1])

      //assignment

      const cost = rhinoObject.geometry().getUserStrings()[1]
      console.log(cost)
      
    }
  }


  // clear objects from scene
  scene.traverse((child) => {
    if (!child.isLight) {
      scene.remove(child);
    }
  });

  const buffer = new Uint8Array(doc.toByteArray()).buffer;
  loader.parse(buffer, function (object) {

    // go through all objects, check for userstrings and assing colors

    object.traverse((child) => {
      if (child.isLine) {

        if (child.userData.attributes.geometry.userStringCount > 0) {
          
          //get color from userStrings
          const colorData = child.userData.attributes.userStrings[0]
          const col = colorData[1];

          //convert color from userstring to THREE color and assign it
          const threeColor = new THREE.Color("rgb(" + col + ")");
          const mat = new THREE.LineBasicMaterial({ color: threeColor });
          child.material = mat;
        }
      }
    });

    ///////////////////////////////////////////////////////////////////////
    // add object graph from rhino model to three.js scene
    scene.add(object);

  });
}

function onSliderChange() {
  // show spinner
  document.getElementById("loader").style.display = "block";
  compute();
}


// THREE BOILERPLATE //
let scene, camera, renderer, controls;

function init() {
  // create a scene and a camera
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9ACD32); 
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.z = -5;

  // create the renderer and add it to the html
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // add some controls to orbit the camera
  controls = new OrbitControls(camera, renderer.domElement);

  // add a directional light
  const directionalLight = new THREE.DirectionalLight(0xffffff);
  directionalLight.intensity = 2;
  scene.add(directionalLight);

  const ambientLight = new THREE.AmbientLight();
  scene.add(ambientLight);

  animate();
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  animate();
}

function meshToThreejs(mesh, material) {
  const loader = new THREE.BufferGeometryLoader();
  const geometry = loader.parse(mesh.toThreejsJSON());
  return new THREE.Mesh(geometry, material);
}
