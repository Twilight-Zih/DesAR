import "./App.css";
import * as THREE from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
// import { XREstimatedLight } from "three/examples/jsm/webxr/XREstimatedLight";

function App() {
  let reticle;
  let hitTestSource = null;
  let hitTestSourceRequested = false;

  let scene, camera, renderer;

  let models = [
    "./dylan_armchair_yolk_yellow.glb",
    "./ivan_armchair_mineral_blue.glb",
    "./marble_coffee_table.glb",
    "./flippa_functional_coffee_table_w._storagewalnut.glb",
    "./frame_armchairpetrol_velvet_with_gold_frame.glb",
    "./elnaz_nesting_side_tables_brass__green_marble.glb",
    "./tea-table.glb",
    "./sofa1.glb",
    "./brown-sofa.glb",
    "./red-sofa.glb",
    "./bean-bag.glb",
    "./bed-table.glb",
    "./table-lamp.glb",
    "./round-table.glb",
    "./modern-lamp.glb",
    "./pouf.glb"
  ];
  let modelScaleFactor = [0.01, 0.01, 0.005, 0.01, 0.01, 0.01, 1, 1, 30, 0.01, 0.7, 0.25, 0.01, 1, 0.7, 1];
  let items = [];
  let itemSelectedIndex = 0;

  let controller;
  let lastPlacedObject = null; // Store the last placed object

  // Stack to keep track of placed objects
  let placedObjects = [];
  const MIN_DISTANCE_BETWEEN_OBJECTS = 0.9; // Minimum distance between placed objects

  init();
  setupFurnitureSelection();
  setupRotationControls(); // Set up rotation buttons
  setupRemoveButton(); // Set up remove button
  animate();

  function init() {
    let myCanvas = document.getElementById("canvas");
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
      70,
      myCanvas.innerWidth / myCanvas.innerHeight,
      0.01,
      20
    );

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    renderer = new THREE.WebGLRenderer({
      canvas: myCanvas,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(myCanvas.innerWidth, myCanvas.innerHeight);
    renderer.xr.enabled = true;

    // AR Button
    let arButton = ARButton.createButton(renderer, {
      requiredFeatures: ["hit-test"],
      optionalFeatures: ["dom-overlay", "light-estimation"],
      domOverlay: { root: document.body },
    });
    arButton.style.bottom = "20%";
    document.body.appendChild(arButton);

    // Load Models
    for (let i = 0; i < models.length; i++) {
      const loader = new GLTFLoader();
      loader.load(models[i], function (glb) {
        let model = glb.scene;
        items[i] = model;
      });
    }

    controller = renderer.xr.getController(0);
    scene.add(controller);

    // Reticle
    reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial()
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    // Add Place Button
    const placeButton = document.createElement("button");
    placeButton.innerText = "Place";
    placeButton.className = "place-button";
    placeButton.addEventListener("click", onPlaceButtonClicked);
    document.body.appendChild(placeButton);
  }

  // Load Models with error handling
for (let i = 0; i < models.length; i++) {
  const loader = new GLTFLoader();
  loader.load(
    models[i],
    function (glb) {
      let model = glb.scene;
      items[i] = model;
    },
    undefined,
    function (error) {
      console.error(`Error loading model ${models[i]}:`, error);
    }
  );
}

function onPlaceButtonClicked() {
  if (reticle.visible) {
    // Ensure the selected item is loaded before placing it
    if (!items[itemSelectedIndex]) {
      console.error("Model not yet loaded, please try again.");
      return;
    }

    const newModel = items[itemSelectedIndex].clone();
    newModel.visible = true;

    // Decompose reticle's position and apply to new model
    reticle.matrix.decompose(
      newModel.position,
      newModel.quaternion,
      newModel.scale
    );

    // Check if the object is far enough from existing objects
    if (canPlaceObject(newModel.position)) {
      // Set the scale of the new model
      let scaleFactor = modelScaleFactor[itemSelectedIndex];
      newModel.scale.set(scaleFactor, scaleFactor, scaleFactor);

      // Add the new model to the scene
      scene.add(newModel);

      // Store the new model in the placed objects stack
      placedObjects.push(newModel);

      // Keep reference to the last placed object
      lastPlacedObject = newModel;
    } else {
      console.log("Object is too close to another object.");
    }
  }
}


  function canPlaceObject(position) {
    for (let i = 0; i < placedObjects.length; i++) {
      const distance = placedObjects[i].position.distanceTo(position);
      if (distance < MIN_DISTANCE_BETWEEN_OBJECTS) {
        return false; // Too close to another object
      }
    }
    return true;
  }

  // Set up the furniture selection
  const onClicked = (e, selectItem, index) => {
    itemSelectedIndex = index;

    // Remove image selection from others to indicate unclicked
    for (let i = 0; i < models.length; i++) {
      const el = document.querySelector(`#item` + i);
      el.classList.remove("clicked");
    }

    // Set image to selected
    e.target.classList.add("clicked");
  };

  function setupFurnitureSelection() {
    for (let i = 0; i < models.length; i++) {
      const el = document.querySelector(`#item` + i);
      el.addEventListener("beforexrselect", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClicked(e, items[i], i);
      });
    }
  }

  // Add rotation controls
  function setupRotationControls() {
    const rotateLeftButton = document.createElement("button");
    rotateLeftButton.innerText = "Rotate Left";
    rotateLeftButton.className = "rotate-left-button";
    rotateLeftButton.addEventListener("click", () => rotateObject(-Math.PI / 8));
    document.body.appendChild(rotateLeftButton);

    const rotateRightButton = document.createElement("button");
    rotateRightButton.innerText = "Rotate Right";
    rotateRightButton.className = "rotate-right-button";
    rotateRightButton.addEventListener("click", () => rotateObject(Math.PI / 8));
    document.body.appendChild(rotateRightButton);
  }

  // Rotate the last placed object
  function rotateObject(angle) {
    if (lastPlacedObject) {
      lastPlacedObject.rotation.y += angle; // Rotate along the Y-axis
    }
  }

  // Set up remove button
  function setupRemoveButton() {
    const removeButton = document.createElement("button");
    removeButton.innerText = "Remove";
    removeButton.className = "remove-button";
    removeButton.addEventListener("click", removeLastObject);
    document.body.appendChild(removeButton);
  }

  // Remove the last placed object
  function removeLastObject() {
    if (lastPlacedObject) {
      scene.remove(lastPlacedObject); // Remove the last placed object from the scene

      // Remove the last object from the stack
      placedObjects.pop();

      // Update the last placed object to the previous one in the stack
      lastPlacedObject = placedObjects.length > 0 ? placedObjects[placedObjects.length - 1] : null;
    }
  }

  function animate() {
    renderer.setAnimationLoop(render);
  }

  function render(timestamp, frame) {
    if (frame) {
      const referenceSpace = renderer.xr.getReferenceSpace();
      const session = renderer.xr.getSession();

      if (hitTestSourceRequested === false) {
        session.requestReferenceSpace("viewer").then(function (referenceSpace) {
          session
            .requestHitTestSource({ space: referenceSpace })
            .then(function (source) {
              hitTestSource = source;
            });
        });

        session.addEventListener("end", function () {
          hitTestSourceRequested = false;
          hitTestSource = null;
        });

        hitTestSourceRequested = true;
      }

      if (hitTestSource) {
        const hitTestResults = frame.getHitTestResults(hitTestSource);

        if (hitTestResults.length) {
          const hit = hitTestResults[0];

          const matrix = hit.getPose(referenceSpace).transform.matrix;
          const normal = new THREE.Vector3(matrix[4], matrix[5], matrix[6]);

          const angleFromUp = normal.angleTo(new THREE.Vector3(0, 1, 0));

          const verticalThreshold = THREE.MathUtils.degToRad(20);

          if (angleFromUp < verticalThreshold) {
            reticle.visible = true;
            reticle.matrix.fromArray(matrix);
          } else {
            reticle.visible = false;
          }
        } else {
          reticle.visible = false;
        }
      }
    }

    renderer.render(scene, camera);
  }

  return <div className="App"></div>;
}

export default App;
