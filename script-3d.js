import * as THREE from './three-155-min.js';
import { OrbitControls } from './orbit-controls.js';


export const mainScript = {
	init: function (props, data, labels) {
		// settings
		let assetHeight = 10000,
			scrollPct = 0,
			containerCanvas = null,
			labelscont = document.querySelector('.g-3d-labels-cont'),
			container = document.querySelector('.g-asset-container'),
			scrollStart = 0.0,
			scrollEnd = 0.95,
			frameLength = 750,
			debug = true,
			scene = null,
			camera = null,
			renderer = null,
			now = null,
			controls = null,
			then = Date.now(),
			fpsInterval = 1000 / 60,
			scrollPctAdj = 0,
			lerpDivider = 12,
			frameCurr = 0,
			frameSegIndex = 0,
			useOrbit = window.location.href.indexOf('orbit') > -1,
			throttleResize = false,
			addAxes = true,
			myreq = null,
			inkLoader   = new THREE.TextureLoader (),
			inkBlack = null,
			pathTexture = null,
			drawMaterial = null,
			drawmesh = null,
			pathObj = {},
			worldWidth = 1600,
			worldDepth = 1156,
			options = { backgroundColor: 0xffffff },
			baseColor   = { note: { yellow: [0xdbbf49,0xffd626], purple: [0xb878cf,0xe394ff], orange: [0xc97c10,0xf59f28], green: [0xffffff,0xffffff], clear: [0xffffff,0xffffff]},
                      tape: { blue: [0x1891ad,0x1a9ec6], purple: [0xb878cf,0xe394ff], orange: [0xc97c10,0xf59f28], green: [0x59bd5a,0x76ed76]},
                      image: { grey: [0xaaaaaa, 0xaaaaaa] }
                    },
			cameraPos = [
				{ id: 0, frame: 0, pos: { x: -5, y: 2128, z: 1845, ease: 'easeOut' } },
				{ id: 1, frame: 750, pos: { x: -5, y: 2128, z: 1000, ease: 'easeOut' } },
				// { id: 2, frame: 80, pos: { x: 20, y: 800, z: 700, ease: 'easeOut' } },
				// { id: 3, frame: 110, pos: { x: 200, y: 430, z: 340, ease: 'easeIn' } },
				// { id: 4, frame: 150, pos: { x: 0, y: 430, z: 340, ease: 'easeIn' } },
				// { id: 5, frame: 200, pos: { x: -150, y: 430, z: 340, ease: 'easeOut' } },
				// { id: 6, frame: 250, pos: { x: 0, y: 800, z: 700, ease: 'easeOut' } },
				// { id: 7, frame: 750, pos: { x: 240, y: 430, z: 340, ease: 'easeOut' } }
			],
			cameraAimPos = [
				{ id: 0, frame: 0, pos: { x: 20, y: 150, z: 0, ease: 'easeOut' } },
				{ id: 1, frame: 750, pos: { x: 20, y: 150, z: 0, ease: 'easeOut' } },
				// { id: 2, frame: 80, pos: { x: 20, y: 0, z: 0, ease: 'easeOut' } },
				// { id: 3, frame: 110, pos: { x: 200, y: 100, z: 0, ease: 'easeIn' } },
				// { id: 4, frame: 150, pos: { x: 0, y: 50, z: 0, ease: 'easeIn' } },
				// { id: 5, frame: 200, pos: { x: -150, y: 0, z: 0, ease: 'easeOut' } },
				// { id: 6, frame: 250, pos: { x: 20, y: 0, z: 0, ease: 'easeOut' } },
				// { id: 7, frame: 750, pos: { x: 240, y: 100, z: 0, ease: 'easeOut' } }
			];

		const wall = {"note":[{"height":worldDepth,"width":worldWidth,"rotation":0,"center":[0,0],"distance": 1000, "level": 1,"name": "influence","color":"green"}]}

		labelscont.innerHTML = '';

		const addDebugElems = () => {
			for (let i = 0; i < 1.005; i += 0.005) {
				let debugTick = document.createElement('div'),
					tickRange = scrollEnd - scrollStart,
					tickPct = (i - scrollStart) / tickRange,
					viewHeight = window.innerHeight,
					halfHeight = viewHeight / 2;

				debugTick.className = 'g-asset-debug-pct';
				debugTick.style.top = halfHeight + (assetHeight - viewHeight) * i + 'px';

				if (i < scrollStart || i - 0.005 > scrollEnd) {
					let percent = i < scrollStart ? 0 : frameLength;
					debugTick.innerHTML = percent.toFixed(1) + '&nbsp;';
					debugTick.classList.add('g-asset-debug-pct-soft');
				} else {
					debugTick.innerHTML = (tickPct * frameLength).toFixed(1) + '&nbsp;';
				}
				container.appendChild(debugTick);
			}
		};

		const valueTween = (sPos, ePos, time, dur, ease) => {
			let change = ePos - sPos,
				locTime = time;

			if (!dur || dur === 1 || time === dur) return ePos;

			switch (ease) {
				case 'linear':
					return sPos + change * (time / dur);
				case 'easeIn':
					return change * (locTime /= dur) * locTime * locTime + sPos;
				case 'easeOut':
					return change * ((locTime = time / dur - 1) * locTime * locTime + 1) + sPos;
				case 'easeInOut':
					if ((locTime /= dur / 2) < 1) return (change / 2) * locTime * locTime * locTime + sPos;
					return (change / 2) * ((locTime -= 2) * locTime * locTime + 2) + sPos;
				default:
					return sPos + change * (time / dur);
			}
		};

		const onPageScroll = () => {
			const scrollTop =
				window.pageYOffset || document.body.scrollTop || document.documentElement.scrollTop;

			let assetHeight = container.offsetHeight,
				containerTop = container.offsetTop,
				containerBottom = containerTop + container.offsetHeight,
				containerStart = containerTop,
				containerEnd = containerBottom - containerCanvas.offsetHeight;

			let startStopLength = scrollStart + (1 - scrollEnd),
				startHeight = assetHeight * scrollStart,
				startStopHeight = assetHeight * startStopLength;

			scrollPct =
				(scrollTop - containerStart - startHeight) /
				(containerEnd - containerStart - startStopHeight);
			scrollPct = scrollPct < 0 ? 0 : scrollPct > 1 ? 1 : scrollPct;

			console.log(scrollPct)
		};

		const onWindowResize = () => {
			if (!throttleResize) {
				const width = window.innerWidth;
				const height = window.innerHeight;

				renderer.setSize(width, height);
				camera.aspect = width / height;
				camera.updateProjectionMatrix();

				setTimeout(function () {
					throttleResize = false;
				}, 150);
			}
		};

		const setupScene = () => {
			const width = window.innerWidth;
			const height = window.innerHeight;

			scene = new THREE.Scene();
			camera = new THREE.PerspectiveCamera(35, width / height, 1e-6, 1e27);

			if (useOrbit) {
				controls = new OrbitControls(camera, container);
				// controls.enablePan = false;
				controls.addEventListener('change', () => console.log(controls.object.position));
				document.querySelector('.g-asset-scroll-annotations').style.display = 'none';
			}

			if (addAxes) {
				const axesHelper = new THREE.AxesHelper(20000);
				scene.add(axesHelper);
			}

			camera.position.x = cameraPos[0].pos.x;
			camera.position.y = cameraPos[0].pos.y;
			camera.position.z = cameraPos[0].pos.z;

			renderer = new THREE.WebGLRenderer({
				logarithmicDepthBuffer: true,
				antialias: true,
				alpha: true
			});
			renderer.setClearColor(new THREE.Color(options.backgroundColor));
			renderer.setPixelRatio(window.devicePixelRatio);
			renderer.setSize(window.innerWidth, window.innerHeight);
			containerCanvas = renderer.domElement;
			container.appendChild(containerCanvas);
		};

		const setupLights = () => {
			const ambient = new THREE.AmbientLight(0xffffff);
			scene.add(ambient);

			var light = new THREE.DirectionalLight(0xfdfcf0, 5);
			// light.position.set(10000, 1000, -10000);
			light.position.set(100, 100, -100);
			scene.add(light);
		};

		const addGround = () => {
			const groundGroup = new THREE.Group();

			let baseMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
			let baseGeo = new THREE.PlaneGeometry(worldWidth, worldDepth);
			let baseMesh = new THREE.Mesh(baseGeo, baseMat);
			baseMesh.rotation.x = -Math.PI / 2;
			baseMesh.position.set(0, 1.5, 0);
			groundGroup.add(baseMesh);

			const groundGeo = new THREE.PlaneGeometry(
				worldWidth,
				worldDepth,
				worldWidth - 1,
				worldDepth - 1
			);

			let disMap = new THREE.TextureLoader().load('dem.jpg');
			let texture = new THREE.TextureLoader().load('mapbase.jpg');

			let groundMat = new THREE.MeshStandardMaterial({
				color: 0xffffff,
				displacementMap: disMap,
				displacementScale: 50,
				map: texture,
				metalness: 0.3,
				roughness: 1,
				castShadow: true,
				receiveShadow: true,
				transparent: true
			});

			let groundMesh = new THREE.Mesh(groundGeo, groundMat);
			groundMesh.rotation.x = -Math.PI / 2;
			groundMesh.position.set(0, 0, 0);
			groundGroup.add(groundMesh);

			let groundMat2 = new THREE.MeshStandardMaterial({
				map: texture,
				metalness: 0.3,
				roughness: 1,
				depethTest: false,
				transparent: true
			});

			let groundMesh2 = new THREE.Mesh(groundGeo, groundMat2);
			groundMesh2.rotation.x = -Math.PI / 2;
			groundMesh2.position.set(0, 0, 0);
			groundGroup.add(groundMesh2);

			// scene.add(groundGroup);
		};

		const loadTexture = (feature) => {
			const positionLoader = new THREE.TextureLoader ();
			positionLoader.load ("path.png", function (texture) {
				texture.minFilter = THREE.NearestFilter;
				texture.magFilter = THREE.NearestFilter;
				feature.material.uniforms.uImageWritingPosition.value = texture;
				feature.material.uniforms.uFrames.value = 1500;
				feature.material.uniforms.uImageWritingColor.value = inkBlack;
			});

			const mapbaseLoader = new THREE.TextureLoader();
			mapbaseLoader.load("mapbase.jpg", function (texture) {
				feature.material.uniforms.uMixImage.value = texture;
				feature.material.uniforms.uMixStrength.value = 0.5; 
			})
		}
		
		
	const addPath = () => {
	  const group = new THREE.Group ();
	
	  for (var note of wall.note) {
		const material = shaderShapes ("note", note),
				mesh   = new THREE.Mesh (new THREE.BoxGeometry (note.width, note.height, 1), material);
			
		mesh.position.set(0, 0, 0);
		mesh.rotation.x = -Math.PI / 2;
		mesh.castShadow = true;
		material.transparent = true;
		note.material = material;

		loadTexture (note);

		group.add (mesh);
	  }
	
	  group.name = "notes";
	
	  scene.add (group);
	}
	
	const shaderShapes = (type, shape) =>
		{
		  let color1 = baseColor[type][shape.color][1],
			  color2 = baseColor[type][shape.color][0];
		
		  var material = new THREE.ShaderMaterial({
			uniforms: {
			  color1: {
				value: new THREE.Color(color1)
			  },
			  color2: {
				value: new THREE.Color(color2)
			  },
			  uMixImage: {
				value: null, // Texture for the new image
				type: "t"
			  },
			  uMixStrength: {
				value: 0.0
			  },
			  bboxMin: {
				value: [0.0,0.0,0.0]
			  },
			  bboxMax: {
				value: [1.0,shape.height,1.0]
			  },
			  uHasWritten: {
				value: 0.0
			  },
			  uImageWritingPosition: {
				value: null,
				type: "t"
			  },
			  uImageWritingColor: {
				value: null,
				type: "t"
			  },
			  uFrames: {
				value: 1.0,
			  },
			  uDrawPct : {
				value: 0.0
			  },
			  uDistance: {
				value: shape.distance
			  },
			  uIsClear: {
				value: 0.0
			  }
			  },
			vertexShader: `
			  uniform vec3 bboxMin;
			  uniform vec3 bboxMax;
			  uniform sampler2D uMixImage;
			  uniform float uMixStrength; 

			  varying vec2 vUv;
			  varying vec2 vTexCoord;
		  
			  void main() {
				vTexCoord = uv;
				vUv.y = (position.y - bboxMin.y) / (bboxMax.y - bboxMin.y);
				vUv.x = (position.x - bboxMin.x) / (bboxMax.x - bboxMin.x);
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
			  }
			`,
			fragmentShader: `
			  uniform vec3 color1;
			  uniform vec3 color2;
			  uniform sampler2D uImageWritingPosition;
			  uniform sampler2D uImageWritingColor;
			  uniform sampler2D uMixImage;
			  uniform float uMixStrength; 
			  uniform float uDrawPct;
			  uniform vec2 uTexCoord;
			  uniform float uFrames;
			  uniform float uDistance;
			  uniform float uIsClear;
		
			  varying vec2 vTexCoord;
			
			  varying vec2 vUv;
			  
			  void main() {
			  
			  	// Sample the existing textures
				vec4 tex2D = texture2D (uImageWritingPosition, vTexCoord);
				vec4 color2D = texture2D (uImageWritingColor, vTexCoord);

			  	// Existing color logic
				vec3 blended = vec3(color2D.r, color2D.g, color2D.b); 
				vec4 textColor = vec4 (blended, tex2D.b);

				// Calculate pixel percentage
				float red = tex2D.r;
				float green = tex2D.g;
				float pixelPct = ((red * 255.0) + (green * 65280.0)) / uFrames;
			  
			  	// Existing output color
				vec4 outColor = red + green > 0.0 && uDrawPct > pixelPct ? textColor :  vec4(255.0, 255.0, 255.0, 0.0);

				// Sample the new image
				vec4 mixImageColor = texture2D(uMixImage, vTexCoord);

				// Extract alpha channels
				float foregroundAlpha = outColor.a;   // Alpha of outColor (foreground)

				// Perform alpha compositing
				vec3 finalRGB = mixImageColor.rgb * (1.0 - foregroundAlpha) + outColor.rgb * foregroundAlpha;
				float finalAlpha = max(mixImageColor.a, foregroundAlpha); // Keep max alpha for visibility

				// Set the final color
				gl_FragColor = vec4(finalRGB, finalAlpha);

			  }
			`,
			wireframe: false
		  });
			
		//   gl_FragColor = outColor * (1.0 - (uDistance/9000.0)); //vec4(mix(color1, color2, vUv.y), 1.0); //outColor;
		// gl_fragColor = vec4(mix(color1, color2, vUv.y), 1.0);

		
		  return material;
		}

		const sluggify = (x) => {
			return x
				.toLowerCase()
				.split(' ')
				.join('-')
				.replace(/[.,\/#!$%\^&\*;:{}=\_`~()]/g, '');
		};

		const getScreenPos = (x, y, z) => {
			var p = new THREE.Vector3(x, y, z);
			var vector = p.project(camera);
			vector.x = ((vector.x + 1) / 2) * window.innerWidth;
			vector.y = (-(vector.y - 1) / 2) * window.innerHeight;
			return vector;
		};

		function componentToHex(c) {
			var hex = c.toString(16);
			return hex.length == 1 ? '0' + hex : hex;
		}

		function rgbToHex(r, g, b) {
			return componentToHex(r) + componentToHex(g) + componentToHex(b);
		}

		const addLabels = () => {
			labels.forEach(function (d) {
				let id = sluggify(d.name);

				let textEl = document.createElement('div');
				textEl.classList.add('g-3d-label');
				textEl.classList.add(id);
				textEl.classList.add(d.align);
				textEl.classList.add(d.valign);
				textEl.style.color = d.color;

				let innerEl = document.createElement('div');
				innerEl.classList.add('g-inner');
				innerEl.innerHTML =
					d.text.indexOf('\r') > -1 ? d.text.replace('\r', '<span>') + '</span>' : d.text;
				textEl.appendChild(innerEl);

				if (id == 'jungfrau') {
					let mtEl = document.createElement('div');
					mtEl.classList.add('g-mt');
					textEl.appendChild(mtEl);
				}

				labelscont.appendChild(textEl);

				let colorsplit = d.color.split('rgb(')[1].replace(')', '').split(',');
				let r = +colorsplit[0];
				let g = +colorsplit[1];
				let b = +colorsplit[2];

				const geometry = new THREE.CircleGeometry(1.2, 32);
				const material = new THREE.MeshBasicMaterial({
					color: +('0x' + rgbToHex(r, g, b)),
					depthTest: false
				});
				const circle = new THREE.Mesh(geometry, material);

				d.pos = { x: 0, y: 0, z: 0 };
				d.pos.z =
					d.top_calc > 0.5 ? (d.top_calc - 0.5) * worldDepth : -(0.5 - d.top_calc) * worldDepth;
				d.pos.x =
					d.left_calc > 0.5 ? (d.left_calc - 0.5) * worldWidth : -(0.5 - d.left_calc) * worldWidth;

				circle.position.set(d.pos.x, d.pos.y, d.pos.z);
				circle.rotation.x = -Math.PI / 2;
				circle.name = id;

				if (id == 'jungfrau') {
					circle.visible = false;
				}
				scene.add(circle);
			});
		};

		let prevSegment = -1;
		const animate = () => {
			now = Date.now();

			if (now - then > fpsInterval) {
				then = now - ((now - then) % fpsInterval);
				scrollPctAdj += (scrollPct - scrollPctAdj) / lerpDivider;
				frameCurr = frameLength * scrollPctAdj;

				for (let i = cameraPos.length - 1; i >= 0; i--) {
					if (frameCurr >= cameraPos[i].frame && cameraPos[i + 1]) {
						let tweening = 'easeInOut', //debug ? "linear" : "easeInOut",
							segmentPct =
								(frameCurr - cameraPos[i].frame) / (cameraPos[i + 1].frame - cameraPos[i].frame),
							newX = valueTween(
								cameraPos[i].pos.x,
								cameraPos[i + 1].pos.x,
								segmentPct * 100,
								100,
								cameraPos[i].ease
							),
							newY = valueTween(
								cameraPos[i].pos.y,
								cameraPos[i + 1].pos.y,
								segmentPct * 100,
								100,
								cameraPos[i].ease
							),
							newZ = valueTween(
								cameraPos[i].pos.z,
								cameraPos[i + 1].pos.z,
								segmentPct * 100,
								100,
								cameraPos[i].ease
							),
							newAimX = valueTween(
								cameraAimPos[i].pos.x,
								cameraAimPos[i + 1].pos.x,
								segmentPct * 100,
								100,
								cameraAimPos[i].ease
							),
							newAimY = valueTween(
								cameraAimPos[i].pos.y,
								cameraAimPos[i + 1].pos.y,
								segmentPct * 100,
								100,
								cameraAimPos[i].ease
							),
							newAimZ = valueTween(
								cameraAimPos[i].pos.z,
								cameraAimPos[i + 1].pos.z,
								segmentPct * 100,
								100,
								cameraAimPos[i].ease
							);

						if (!useOrbit) {
							camera.position.set(newX, newY, newZ);
							camera.lookAt(newAimX, newAimY, newAimZ);
						}

						labels.forEach(function (d) {
							let id = sluggify(d.name);
							let textEl = document.querySelector('.' + id);
							let textpos = getScreenPos(d.pos.x, d.pos.y, d.pos.z);
							textEl.style.top = textpos.y + 'px';
							textEl.style.left = textpos.x + 'px';
						});

						frameSegIndex = i;

						if (prevSegment != frameSegIndex) {
							console.log(prevSegment);
						}

						i = -1;
						prevSegment = frameSegIndex;
					}
				}

				wall.note[0].material.uniforms.uDrawPct.value = scrollPct;

				renderer.render(scene, camera);
			}
			myreq = requestAnimationFrame(animate);
		};

		container.style.height = assetHeight + 'px';

		
		setupScene();
		setupLights();

		inkLoader.load ("ink-black.png", function (texture) {
			inkBlack = texture;
			
			addGround();
			addLabels();

			addPath();

			window.addEventListener('resize', onWindowResize);
			window.addEventListener('scroll', onPageScroll);

			if (debug) addDebugElems();

			cancelAnimationFrame(myreq);
			animate();
		})
	}
};

	