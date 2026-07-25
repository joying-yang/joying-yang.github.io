(function () {
  'use strict';

  var CAMERA_VERTICAL_FOV = 40;
  var FOCUSED_PANEL_DISTANCE = 8.7;
  var PANEL_VIEWPORT_WIDTH_RATIO = 0.75;
  var PANEL_VIEWPORT_HEIGHT_RATIO = 0.75;
  var PANEL_MAX_ASPECT_RATIO = 2;
  var PANEL_SOURCE_HEIGHT = 700;
  var DEFAULT_PANEL_ASPECT_RATIO = 1.6;
  var DEFAULT_PANEL_WORLD_HEIGHT = 2 * FOCUSED_PANEL_DISTANCE * Math.tan((CAMERA_VERTICAL_FOV * Math.PI) / 360) * PANEL_VIEWPORT_HEIGHT_RATIO;
  var DEFAULT_PANEL_WORLD_WIDTH = DEFAULT_PANEL_WORLD_HEIGHT * DEFAULT_PANEL_ASPECT_RATIO;

  var STOPS = {
    entry: {
      frame: [0, 0, 6],
      camera: [0, 0.4, 14],
      target: [-1.4, 0, 4],
    },
    education: {
      frame: [0, 0, 0],
      yaw: 0,
      size: [DEFAULT_PANEL_WORLD_WIDTH, DEFAULT_PANEL_WORLD_HEIGHT],
      camera: [0, 0, 8.7],
      target: [0, 0, 0],
    },
    work: {
      frame: [5.6, -0.1, -6.8],
      yaw: -28,
      size: [DEFAULT_PANEL_WORLD_WIDTH, DEFAULT_PANEL_WORLD_HEIGHT],
      camera: [1.51559740376275, -0.1, 0.8816440578726645],
      target: [5.6, -0.1, -6.8],
    },
    projects: {
      frame: [-3.8, 0.25, -14.4],
      yaw: 24,
      size: [DEFAULT_PANEL_WORLD_WIDTH, DEFAULT_PANEL_WORLD_HEIGHT],
      camera: [-0.26139120524053894, 0.25, -6.452154518509373],
      target: [-3.8, 0.25, -14.4],
    },
    skills: {
      frame: [2.8, -0.15, -22],
      yaw: -20,
      size: [DEFAULT_PANEL_WORLD_WIDTH, DEFAULT_PANEL_WORLD_HEIGHT],
      camera: [-0.175575246933318, -0.15, -13.8246741991626],
      target: [2.8, -0.15, -22],
    },
  };

  var ORDER = ['education', 'work', 'projects', 'skills'];

  function createScene(canvas, callbacks) {
    callbacks = callbacks || {};
    var gl;

    try {
      gl = canvas.getContext('webgl', {
        alpha: true,
        antialias: true,
        depth: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
      });
    } catch (error) {
      callbacks.onError && callbacks.onError(error);
      return null;
    }

    if (!gl) {
      callbacks.onError && callbacks.onError(new Error('WebGL is unavailable'));
      return null;
    }

    var vertexSource = [
      'attribute vec3 aPosition;',
      'uniform mat4 uProjection;',
      'uniform mat4 uView;',
      'uniform float uPointSize;',
      'void main() {',
      '  gl_Position = uProjection * uView * vec4(aPosition, 1.0);',
      '  gl_PointSize = uPointSize;',
      '}',
    ].join('\n');

    var fragmentSource = [
      'precision mediump float;',
      'uniform vec4 uColor;',
      'void main() {',
      '  gl_FragColor = uColor;',
      '}',
    ].join('\n');

    var program;
    try {
      program = makeProgram(gl, vertexSource, fragmentSource);
    } catch (error) {
      callbacks.onError && callbacks.onError(error);
      return null;
    }

    var location = {
      position: gl.getAttribLocation(program, 'aPosition'),
      projection: gl.getUniformLocation(program, 'uProjection'),
      view: gl.getUniformLocation(program, 'uView'),
      color: gl.getUniformLocation(program, 'uColor'),
      pointSize: gl.getUniformLocation(program, 'uPointSize'),
    };

    var geometry = {
      grid: makeBuffer(gl, makeGrid()),
      rails: makeBuffer(gl, makeRails()),
      portalOuter: makeBuffer(gl, makePortal(2.5)),
      portalInner: makeBuffer(gl, makePortal(1.12)),
      frames: {},
      workDepth: makeBuffer(gl, makeWorkDepth()),
      projectCorridor: makeBuffer(gl, makeProjectCorridor()),
      fragments: makeBuffer(gl, makeFragments()),
      beacons: makeBuffer(gl, makeBeacons()),
      fills: {},
      motifs: {},
    };

    ORDER.forEach(function (id) {
      var size = STOPS[id].size;
      geometry.frames[id] = makeBuffer(gl, makeFrame(STOPS[id].frame, STOPS[id].yaw, size));
      geometry.fills[id] = makeBuffer(gl, makePanelFill(STOPS[id].frame, STOPS[id].yaw, size));
      geometry.motifs[id] = makeBuffer(gl, makePanelMotif(id, STOPS[id].frame, STOPS[id].yaw, size));
    });

    var projection = new Float32Array(16);
    var view = new Float32Array(16);
    var camera = STOPS.entry.camera.slice();
    var target = STOPS.entry.target.slice();
    var active = 'education';
    var routePosition = -0.72;
    var phase = 'gate';
    var reducedMotion = false;
    var animation = null;
    var frameRequest = 0;
    var ready = false;
    var destroyed = false;
    var width = 1;
    var height = 1;
    var quality = 'desktop';
    var panelGeometryKey = '';
    var panelSourceSize = {
      width: PANEL_SOURCE_HEIGHT * DEFAULT_PANEL_ASPECT_RATIO,
      height: PANEL_SOURCE_HEIGHT,
    };

    gl.useProgram(program);
    gl.enableVertexAttribArray(location.position);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    function resize() {
      var rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      quality = width < 768 ? 'mobile' : width < 1200 ? 'tablet' : 'desktop';
      syncPanelGeometry();
      var cap = quality === 'desktop' ? 1.5 : quality === 'tablet' ? 1.25 : 1;
      var dpr = Math.min(window.devicePixelRatio || 1, cap);
      var nextWidth = Math.max(1, Math.round(width * dpr));
      var nextHeight = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
        gl.viewport(0, 0, nextWidth, nextHeight);
      }
      perspective(projection, (CAMERA_VERTICAL_FOV * Math.PI) / 180, width / height, 0.1, 100);
      requestRender();
    }

    function syncPanelGeometry() {
      var targetHeight = Math.max(1, height * PANEL_VIEWPORT_HEIGHT_RATIO);
      var targetWidth = Math.max(1, Math.min(width * PANEL_VIEWPORT_WIDTH_RATIO, targetHeight * PANEL_MAX_ASPECT_RATIO));
      var nextKey = targetWidth.toFixed(3) + 'x' + targetHeight.toFixed(3);
      if (panelGeometryKey === nextKey) return;
      panelGeometryKey = nextKey;

      var visibleWorldHeight = 2 * FOCUSED_PANEL_DISTANCE * Math.tan((CAMERA_VERTICAL_FOV * Math.PI) / 360);
      var worldSize = [
        visibleWorldHeight * targetWidth / height,
        visibleWorldHeight * targetHeight / height,
      ];

      panelSourceSize = {
        width: PANEL_SOURCE_HEIGHT * targetWidth / targetHeight,
        height: PANEL_SOURCE_HEIGHT,
      };

      ORDER.forEach(function (id) {
        STOPS[id].size = worldSize.slice();
        updateBuffer(geometry.frames[id], makeFrame(STOPS[id].frame, STOPS[id].yaw, STOPS[id].size));
        updateBuffer(geometry.fills[id], makePanelFill(STOPS[id].frame, STOPS[id].yaw, STOPS[id].size));
        updateBuffer(geometry.motifs[id], makePanelMotif(id, STOPS[id].frame, STOPS[id].yaw, STOPS[id].size));
      });
    }

    function requestRender() {
      if (!frameRequest && !destroyed && !document.hidden) {
        frameRequest = window.requestAnimationFrame(render);
      }
    }

    function render(now) {
      frameRequest = 0;
      if (destroyed) return;

      if (animation) {
        var elapsed = Math.max(0, now - animation.startedAt);
        var raw = animation.duration <= 0 ? 1 : Math.min(1, elapsed / animation.duration);
        var canonicalRaw = animation.entry || !animation.reverse ? raw : 1 - raw;
        var canonicalProgress = softLinear(canonicalRaw, 0.14);
        var progress = animation.reverse ? 1 - canonicalProgress : canonicalProgress;
        animation.raw = raw;
        animation.progress = progress;
        routePosition = animation.entry
          ? mix(animation.fromRoute, animation.toRoute, canonicalProgress)
          : mix(animation.lowerRoute, animation.upperRoute, canonicalProgress);

        if (animation.entry) {
          camera = mix3(animation.fromCamera, animation.toCamera, canonicalProgress);
        } else {
          camera = mix3(STOPS[animation.lowerId].camera, STOPS[animation.upperId].camera, canonicalProgress);
        }

        var forward;
        if (animation.entry) {
          forward = interpolateDirection(animation.fromForward, animation.toForward, canonicalProgress, 1);
        } else {
          forward = interpolateDirection(animation.lowerForward, animation.upperForward, canonicalProgress, 1);
        }
        target = add3(camera, scale3(forward, 7.6));

        if (raw >= 1) {
          var completion = animation.onComplete;
          camera = animation.toCamera.slice();
          target = animation.toTarget.slice();
          routePosition = animation.toRoute;
          active = animation.toId;
          animation = null;
          phase = 'idle';
          draw();
          completion && completion();
          return;
        }
      }

      draw();
      if (animation) requestRender();
    }

    function draw() {
      gl.clearColor(0.0078, 0.0117, 0.0274, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      lookAt(view, camera, target, [0, 1, 0]);

      gl.useProgram(program);
      gl.uniformMatrix4fv(location.projection, false, projection);
      gl.uniformMatrix4fv(location.view, false, view);

      var travelLight = phase === 'transitioning' ? 1 : 0;
      var gridAlpha = quality === 'mobile' ? 0.07 : mix(0.095, 0.155, travelLight);
      var railAlpha = quality === 'desktop' ? mix(0.1, 0.23, travelLight) : mix(0.06, 0.13, travelLight);
      var fragmentAlpha = quality === 'mobile' ? 0.035 : mix(0.09, 0.145, travelLight);
      drawBuffer(geometry.grid, gl.LINES, [0.19, 0.42, 0.47, gridAlpha], 1);
      drawBuffer(geometry.rails, gl.LINES, [0.31, 0.68, 0.76, railAlpha], 1);
      drawBuffer(geometry.fragments, gl.LINES, [0.16, 0.35, 0.39, fragmentAlpha], 1);

      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      ORDER.forEach(function (id, index) {
        var emphasis = frameEmphasis(id, index);
        if (quality === 'mobile' && emphasis < 0.34) return;
        if (quality === 'tablet' && emphasis < 0.11) return;
        var fillAlpha = phase === 'gate' ? 0.022 + emphasis * 0.1 : 0.08 + emphasis * 0.48;
        drawBuffer(geometry.fills[id], gl.TRIANGLES, [0.008, 0.039, 0.051, fillAlpha], 1);
      });
      gl.depthMask(true);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

      ORDER.forEach(function (id, index) {
        var alpha = frameEmphasis(id, index);
        if (quality === 'mobile' && alpha < 0.34) return;
        if (quality === 'tablet' && alpha < 0.11) return;

        var color =   alpha > 0.52
          ? [0.31, 0.68, 0.76, alpha]  // #4FADC2
          : [0.19, 0.42, 0.47, alpha]; // #316B77


        // var color = alpha > 0.52 ? [0.84, 0.42, 1, alpha] : [0.58, 0.28, 0.67, alpha];
        drawBuffer(geometry.frames[id], gl.LINES, color, 1);
        drawBuffer(geometry.motifs[id], gl.LINES, [0.25, 0.56, 0.64, alpha * 0.48], 1);
      });

      if (quality !== 'mobile') {
        var workProximity = proximityToRoute(1);
        var projectProximity = proximityToRoute(2);
        drawBuffer(geometry.workDepth, gl.LINES, [0.22, 0.5, 0.57, (quality === 'desktop' ? 0.2 : 0.12) * workProximity], 1);
        drawBuffer(geometry.projectCorridor, gl.LINES, [0.36, 0.75, 0.83, (quality === 'desktop' ? 0.23 : 0.14) * projectProximity], 1);
      }

      if (phase === 'gate' || phase === 'entering') {
        var portalAlpha = phase === 'gate' ? 0.72 : 0.38;
        drawBuffer(geometry.portalOuter, gl.LINES, [0.31, 0.68, 0.76, portalAlpha], 1);
        drawBuffer(geometry.portalInner, gl.LINES, [0.19, 0.42, 0.47], 1);
      }

      if (!reducedMotion && quality !== 'mobile') {
        var beaconAlpha = quality === 'desktop' ? mix(0.42, 0.56, travelLight) : mix(0.24, 0.34, travelLight);
        drawBuffer(geometry.beacons, gl.POINTS, [0.31, 0.68, 1, beaconAlpha], quality === 'desktop' ? 2.2 : 1.6, quality === 'desktop' ? geometry.beacons.count : Math.min(120, geometry.beacons.count));
      }

      emitProjection();

      if (!ready) {
        ready = true;
        canvas.dataset.ready = 'true';
        callbacks.onReady && callbacks.onReady();
      }
    }

    function drawBuffer(item, mode, color, pointSize, count) {
      gl.bindBuffer(gl.ARRAY_BUFFER, item.buffer);
      gl.vertexAttribPointer(location.position, 3, gl.FLOAT, false, 0, 0);
      gl.uniform4fv(location.color, color);
      gl.uniform1f(location.pointSize, pointSize || 1);
      gl.drawArrays(mode, 0, count || item.count);
    }

    function updateBuffer(item, values) {
      gl.bindBuffer(gl.ARRAY_BUFFER, item.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(values), gl.STATIC_DRAW);
      item.count = values.length / 3;
    }

    function frameEmphasis(id, index) {
      if (phase === 'gate') return 0.52 - index * 0.025;

      if (!animation) {
        var settledDistance = Math.abs(ORDER.indexOf(active) - index);
        return settledDistance === 0 ? 0.82 : settledDistance === 1 ? 0.22 : 0.065;
      }

      var raw = animation.reverse ? 1 - (animation.raw || 0) : animation.raw || 0;
      var proximity = 0.07 + 0.16 * proximityToRoute(index);
      if (id === animation.lowerId) {
        return mix(0.82, Math.max(0.16, proximity), smoothstep(0.08, 0.64, raw));
      }
      if (id === animation.upperId) {
        return mix(Math.max(0.16, proximity), 0.82, smoothstep(0.46, 0.94, raw));
      }
      return proximity;
    }

    function proximityToRoute(index) {
      return clamp(1 - Math.abs(routePosition - index) / 1.7, 0.16, 1);
    }

    function emitProjection() {
      if (!callbacks.onProjection) return;
      var frames = {};
      ORDER.forEach(function (id, index) {
        var corners = makePanelCorners(STOPS[id].frame, STOPS[id].yaw, STOPS[id].size);
        var projected = corners.map(projectWorldPoint);
        var allInFront = projected.every(function (point) { return point.w > 0.08 && isFinite(point.x) && isFinite(point.y); });
        var points = projected.map(function (point) { return [point.x, point.y]; });
        var area = allInFront ? polygonArea(points) : 0;
        var bounds = boundsFor(points);
        var intersectsViewport = bounds.right > -width * 0.2 && bounds.left < width * 1.2 && bounds.bottom > -height * 0.2 && bounds.top < height * 1.2;
        frames[id] = {
          corners: points,
          visible: allInFront && area > 36 && intersectsViewport,
          depth: projected.reduce(function (sum, point) { return sum + point.w; }, 0) / projected.length,
          emphasis: frameEmphasis(id, index),
        };
      });

      try {
        callbacks.onProjection({
          phase: phase,
          raw: animation ? animation.raw : 1,
          progress: animation ? animation.progress : 1,
          canonicalRaw: animation ? (animation.reverse ? 1 - animation.raw : animation.raw) : 1,
          from: animation ? animation.fromId : active,
          to: animation ? animation.toId : active,
          lower: animation ? animation.lowerId : active,
          upper: animation ? animation.upperId : active,
          active: active,
          route: routePosition,
          direction: animation ? animation.direction : 0,
          reverse: animation ? animation.reverse : false,
          quality: quality,
          width: width,
          height: height,
          panelSourceSize: {
            width: panelSourceSize.width,
            height: panelSourceSize.height,
          },
          frames: frames,
        });
      } catch (error) {
        /* The WebGL world remains usable if the optional DOM projection layer fails. */
      }
    }

    function projectWorldPoint(point) {
      var vx = view[0] * point[0] + view[4] * point[1] + view[8] * point[2] + view[12];
      var vy = view[1] * point[0] + view[5] * point[1] + view[9] * point[2] + view[13];
      var vz = view[2] * point[0] + view[6] * point[1] + view[10] * point[2] + view[14];
      var clipX = projection[0] * vx;
      var clipY = projection[5] * vy;
      var clipW = -vz;
      return {
        x: (clipX / clipW * 0.5 + 0.5) * width,
        y: (1 - (clipY / clipW * 0.5 + 0.5)) * height,
        w: clipW,
      };
    }

    function transitionTo(id, options) {
      options = options || {};
      if (!STOPS[id]) return;
      var fromIndex = phase === 'gate' ? -1 : Math.max(0, ORDER.indexOf(active));
      var toIndex = Math.max(0, ORDER.indexOf(id));
      if (id === active && phase === 'idle') {
        options.onComplete && options.onComplete();
        return;
      }
      phase = options.entry ? 'entering' : 'transitioning';
      var fromRoute = routePosition;
      var direction = Math.sign(toIndex - fromRoute) || 1;
      var reverse = !options.entry && direction < 0;
      var hopCount = Math.max(1, Math.ceil(Math.abs(toIndex - fromRoute)));
      var defaultDuration = Math.min(1560, 1120 + (hopCount - 1) * 220);
      var lowerRoute = Math.min(fromRoute, toIndex);
      var upperRoute = Math.max(fromRoute, toIndex);
      var lowerId = ORDER[Math.round(lowerRoute)];
      var upperId = ORDER[Math.round(upperRoute)];
      animation = {
        startedAt: performance.now(),
        duration: reducedMotion ? 0 : Math.max(0, options.duration == null ? defaultDuration : options.duration),
        fromCamera: camera.slice(),
        fromTarget: target.slice(),
        toCamera: STOPS[id].camera.slice(),
        toTarget: STOPS[id].target.slice(),
        fromForward: normalize3(subtract3(target, camera)),
        toForward: normalize3(subtract3(STOPS[id].target, STOPS[id].camera)),
        fromId: phase === 'entering' ? 'entry' : active,
        toId: id,
        fromIndex: fromIndex,
        toIndex: toIndex,
        fromRoute: fromRoute,
        toRoute: toIndex,
        lowerRoute: lowerRoute,
        upperRoute: upperRoute,
        lowerId: lowerId,
        upperId: upperId,
        lowerForward: lowerId ? normalize3(subtract3(STOPS[lowerId].target, STOPS[lowerId].camera)) : normalize3(subtract3(target, camera)),
        upperForward: upperId ? normalize3(subtract3(STOPS[upperId].target, STOPS[upperId].camera)) : normalize3(subtract3(STOPS[id].target, STOPS[id].camera)),
        direction: direction,
        reverse: reverse,
        entry: Boolean(options.entry),
        raw: 0,
        progress: 0,
        onComplete: options.onComplete,
      };
      requestRender();
    }

    function setActive(id) {
      if (!STOPS[id]) return;
      active = id;
      phase = 'idle';
      animation = null;
      routePosition = Math.max(0, ORDER.indexOf(id));
      camera = STOPS[id].camera.slice();
      target = STOPS[id].target.slice();
      requestRender();
    }

    function setReduced(value) {
      reducedMotion = Boolean(value);
      if (reducedMotion && animation) {
        var completion = animation.onComplete;
        camera = animation.toCamera.slice();
        target = animation.toTarget.slice();
        routePosition = animation.toRoute;
        active = animation.toId;
        animation = null;
        phase = 'idle';
        draw();
        completion && completion();
        return;
      }
      requestRender();
    }

    function destroy() {
      destroyed = true;
      if (frameRequest) window.cancelAnimationFrame(frameRequest);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      Object.keys(geometry).forEach(function (key) {
        if (key === 'frames' || key === 'fills' || key === 'motifs') {
          Object.keys(geometry[key]).forEach(function (id) { gl.deleteBuffer(geometry[key][id].buffer); });
        } else if (geometry[key] && geometry[key].buffer) {
          gl.deleteBuffer(geometry[key].buffer);
        }
      });
      gl.deleteProgram(program);
    }

    function onVisibility() {
      if (!document.hidden) requestRender();
    }

    canvas.addEventListener('webglcontextlost', function (event) {
      event.preventDefault();
      animation = null;
      callbacks.onLost && callbacks.onLost();
    });

    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    resize();

    return {
      enter: function (onComplete) {
        transitionTo('education', { entry: true, duration: 1150, onComplete: onComplete });
      },
      goTo: function (id, onComplete) {
        transitionTo(id, { onComplete: onComplete });
      },
      setActive: setActive,
      setReducedMotion: setReduced,
      requestRender: requestRender,
      getPose: function () {
        return {
          camera: camera.slice(),
          target: target.slice(),
          route: routePosition,
          active: active,
          phase: phase,
          moving: Boolean(animation),
        };
      },
      destroy: destroy,
      stops: STOPS,
    };
  }

  function makeShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      var message = gl.getShaderInfoLog(shader) || 'Shader compilation failed';
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }

  function makeProgram(gl, vertexSource, fragmentSource) {
    var vertex = makeShader(gl, gl.VERTEX_SHADER, vertexSource);
    var fragment;
    try {
      fragment = makeShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    } catch (error) {
      gl.deleteShader(vertex);
      throw error;
    }
    var program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      var message = gl.getProgramInfoLog(program) || 'Program linking failed';
      gl.deleteProgram(program);
      throw new Error(message);
    }
    return program;
  }

  function makeBuffer(gl, values) {
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(values), gl.STATIC_DRAW);
    return { buffer: buffer, count: values.length / 3 };
  }

  function addLine(list, a, b) {
    list.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  }

  function makeGrid() {
    var list = [];
    var x;
    var z;
    for (x = -20; x <= 20; x += 2) {
      addLine(list, [x, -3.1, 10], [x, -3.1, -34]);
      addLine(list, [x, 3.2, 10], [x, 3.2, -34]);
    }
    for (z = 10; z >= -34; z -= 2) {
      addLine(list, [-20, -3.1, z], [20, -3.1, z]);
      addLine(list, [-20, 3.2, z], [20, 3.2, z]);
      addLine(list, [-14, -3.1, z], [-14, 3.2, z]);
      addLine(list, [14, -3.1, z], [14, 3.2, z]);
    }
    for (var y = -3.1; y <= 3.2; y += 1.575) {
      addLine(list, [-14, y, 10], [-14, y, -34]);
      addLine(list, [14, y, 10], [14, y, -34]);
    }
    return list;
  }

  function makeRails() {
    var list = [];
    var previous = null;
    var previousCeiling = null;
    for (var u = 0; u <= 3.001; u += 0.12) {
      var center = sampleRoute(u);
      var tangent = routeDirection(u, 1);
      var side = normalize3([tangent[2], 0, -tangent[0]]);
      var floorPair = [
        [center[0] + side[0] * 1.75, -3.06, center[2] + side[2] * 1.75],
        [center[0] - side[0] * 1.75, -3.06, center[2] - side[2] * 1.75],
      ];
      var ceilingPair = [
        [floorPair[0][0], 3.14, floorPair[0][2]],
        [floorPair[1][0], 3.14, floorPair[1][2]],
      ];
      if (previous) {
        addLine(list, previous[0], floorPair[0]);
        addLine(list, previous[1], floorPair[1]);
        addLine(list, previousCeiling[0], ceilingPair[0]);
        addLine(list, previousCeiling[1], ceilingPair[1]);
      }
      previous = floorPair;
      previousCeiling = ceilingPair;
    }

    for (var marker = 0; marker <= 3; marker += 0.5) {
      var markerCenter = sampleRoute(marker);
      var markerTangent = routeDirection(marker, 1);
      var markerSide = normalize3([markerTangent[2], 0, -markerTangent[0]]);
      [-1, 1].forEach(function (sideSign) {
        var x = markerCenter[0] + markerSide[0] * 3.65 * sideSign;
        var z = markerCenter[2] + markerSide[2] * 3.65 * sideSign;
        addLine(list, [x, -3.08, z], [x, 3.16, z]);
        addLine(list, [x - 0.18, -3.08, z], [x + 0.18, -3.08, z]);
      });
      var leftX = markerCenter[0] - markerSide[0] * 3.65;
      var leftZ = markerCenter[2] - markerSide[2] * 3.65;
      var rightX = markerCenter[0] + markerSide[0] * 3.65;
      var rightZ = markerCenter[2] + markerSide[2] * 3.65;
      addLine(list, [leftX, -3.08, leftZ], [rightX, -3.08, rightZ]);
      addLine(list, [leftX, 3.16, leftZ], [rightX, 3.16, rightZ]);
    }
    return list;
  }

  function makePortal(size) {
    var z = 6;
    var w = size;
    var h = size * 1.35;
    var list = [];
    addLine(list, [-w, -h, z], [-w, h, z]);
    addLine(list, [-w, h, z], [w, h, z]);
    addLine(list, [w, h, z], [w, -h, z]);
    addLine(list, [w, -h, z], [-w, -h, z]);
    return list;
  }

  function makeFrame(position, yawDegrees, size) {
    var list = [];
    var width = size[0];
    var height = size[1];
    var yaw = ((yawDegrees || 0) * Math.PI) / 180;
    var c = Math.cos(yaw);
    var s = Math.sin(yaw);

    function point(x, y, depth) {
      depth = depth || 0;
      return [
        position[0] + x * c + depth * s,
        position[1] + y,
        position[2] - x * s + depth * c,
      ];
    }

    var left = -width / 2;
    var right = width / 2;
    var bottom = -height / 2;
    var top = height / 2;
    addLine(list, point(left, bottom), point(left, top));
    addLine(list, point(left, top), point(right, top));
    addLine(list, point(right, top), point(right, bottom));
    addLine(list, point(right, bottom), point(left, bottom));

    var mark = 0.28;
    addLine(list, point(left - 0.06, top + 0.06, -0.02), point(left + mark, top + 0.06, -0.02));
    addLine(list, point(left - 0.06, top + 0.06, -0.02), point(left - 0.06, top - mark, -0.02));
    addLine(list, point(right + 0.06, bottom - 0.06, -0.02), point(right - mark, bottom - 0.06, -0.02));
    addLine(list, point(right + 0.06, bottom - 0.06, -0.02), point(right + 0.06, bottom + mark, -0.02));
    addLine(list, point(left + 0.32, top - 0.48, 0), point(right - 0.32, top - 0.48, 0));

    var thickness = -0.075;
    addLine(list, point(left, bottom, thickness), point(left, top, thickness));
    addLine(list, point(left, top, thickness), point(right, top, thickness));
    addLine(list, point(right, top, thickness), point(right, bottom, thickness));
    addLine(list, point(right, bottom, thickness), point(left, bottom, thickness));
    addLine(list, point(left, bottom), point(left, bottom, thickness));
    addLine(list, point(left, top), point(left, top, thickness));
    addLine(list, point(right, top), point(right, top, thickness));
    addLine(list, point(right, bottom), point(right, bottom, thickness));
    return list;
  }

  function makePanelFill(position, yawDegrees, size) {
    var corners = makePanelCorners(position, yawDegrees, size, 0.018);
    var topLeft = corners[0];
    var topRight = corners[1];
    var bottomRight = corners[2];
    var bottomLeft = corners[3];
    return [
      topLeft[0], topLeft[1], topLeft[2],
      bottomLeft[0], bottomLeft[1], bottomLeft[2],
      topRight[0], topRight[1], topRight[2],
      topRight[0], topRight[1], topRight[2],
      bottomLeft[0], bottomLeft[1], bottomLeft[2],
      bottomRight[0], bottomRight[1], bottomRight[2],
    ];
  }

  function makePanelMotif(id, position, yawDegrees, size) {
    var list = [];
    var width = size[0];
    var height = size[1];
    var left = -width / 2 + 0.34;
    var right = width / 2 - 0.34;
    var top = height / 2 - 0.77;
    var bottom = -height / 2 + 0.35;

    function point(x, y) {
      return framePoint(position, yawDegrees, x, y, 0.028);
    }

    if (id === 'education') {
      for (var row = 0; row < 4; row += 1) {
        var rowTop = top - 0.45 - row * 0.58;
        addLine(list, point(left, rowTop), point(right, rowTop));
        addLine(list, point(left + 1.35, rowTop), point(left + 1.35, rowTop - 0.36));
      }
      addLine(list, point(left, bottom + 0.25), point(right - 0.7, bottom + 0.25));
    } else if (id === 'work') {
      var spine = left + 0.48;
      addLine(list, point(spine, top - 0.2), point(spine, bottom + 0.2));
      for (var item = 0; item < 3; item += 1) {
        var itemY = top - 0.55 - item * 0.92;
        addLine(list, point(spine - 0.12, itemY), point(spine + 0.12, itemY));
        addLine(list, point(spine + 0.32, itemY), point(right, itemY));
        addLine(list, point(spine + 0.32, itemY - 0.28), point(right - 0.9, itemY - 0.28));
      }
    } else if (id === 'projects') {
      for (var inset = 0; inset < 3; inset += 1) {
        var offset = inset * 0.28;
        addLine(list, point(left + offset, bottom + 0.35 + offset), point(left + offset, top - 0.2 - offset));
        addLine(list, point(left + offset, top - 0.2 - offset), point(right - offset, top - 0.2 - offset));
        addLine(list, point(right - offset, top - 0.2 - offset), point(right - offset, bottom + 0.35 + offset));
        addLine(list, point(right - offset, bottom + 0.35 + offset), point(left + offset, bottom + 0.35 + offset));
      }
    } else {
      var columns = 2;
      var rows = 3;
      for (var column = 1; column < columns; column += 1) {
        var columnX = mix(left, right, column / columns);
        addLine(list, point(columnX, top - 0.18), point(columnX, bottom + 0.12));
      }
      for (var skillRow = 1; skillRow < rows; skillRow += 1) {
        var skillY = mix(top - 0.18, bottom + 0.12, skillRow / rows);
        addLine(list, point(left, skillY), point(right, skillY));
      }
    }
    return list;
  }

  function makeFragments() {
    var list = [];
    var items = [
      [-8, -0.4, 2, 2.2, 3.4, 18],
      [7.8, 0.6, -2.5, 2.1, 2.8, -12],
      [-7.2, 0.5, -8.8, 1.8, 2.9, 22],
      [8.8, -0.2, -13, 2.5, 3.6, -20],
      [-8.9, -0.5, -20, 2.2, 3.2, 16],
      [7.4, 0.2, -25.5, 2.4, 3.8, -18],
    ];
    items.forEach(function (item) {
      Array.prototype.push.apply(list, makeFrame([item[0], item[1], item[2]], item[5], [item[3], item[4]]));
    });
    return list;
  }

  function makeWorkDepth() {
    var list = [];
    [
      [[4.25, -0.2, -8.7], -25, [4.1, 3.25]],
      [[6.75, 0.05, -10.1], -31, [3.7, 3]],
    ].forEach(function (item) {
      Array.prototype.push.apply(list, makeFrame(item[0], item[1], item[2]));
    });
    return list;
  }

  function makeProjectCorridor() {
    var list = [];
    [
      [[-6.8, 0.05, -12.1], 30, [3.3, 4.2]],
      [[-0.7, 0.12, -17], 17, [3.5, 4.4]],
      [[1.35, -0.08, -19.4], 10, [3, 3.8]],
    ].forEach(function (item) {
      Array.prototype.push.apply(list, makeFrame(item[0], item[1], item[2]));
    });
    return list;
  }

  function makeBeacons() {
    var list = [];
    var seed = 1977;
    function random() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }
    for (var i = 0; i < 320; i += 1) {
      list.push((random() - 0.5) * 22, (random() - 0.5) * 6, 8 - random() * 40);
    }
    return list;
  }

  function framePoint(position, yawDegrees, x, y, depth) {
    var yaw = ((yawDegrees || 0) * Math.PI) / 180;
    var c = Math.cos(yaw);
    var s = Math.sin(yaw);
    depth = depth || 0;
    return [
      position[0] + x * c + depth * s,
      position[1] + y,
      position[2] - x * s + depth * c,
    ];
  }

  function makePanelCorners(position, yawDegrees, size, depth) {
    var halfWidth = size[0] / 2;
    var halfHeight = size[1] / 2;
    return [
      framePoint(position, yawDegrees, -halfWidth, halfHeight, depth),
      framePoint(position, yawDegrees, halfWidth, halfHeight, depth),
      framePoint(position, yawDegrees, halfWidth, -halfHeight, depth),
      framePoint(position, yawDegrees, -halfWidth, -halfHeight, depth),
    ];
  }

  function sampleRoute(value) {
    var points = ORDER.map(function (id) { return STOPS[id].camera; });
    var u = clamp(value, 0, points.length - 1);
    var index = Math.min(points.length - 2, Math.floor(u));
    var amount = index === points.length - 1 ? 1 : u - index;
    var p0 = points[Math.max(0, index - 1)];
    var p1 = points[index];
    var p2 = points[Math.min(points.length - 1, index + 1)];
    var p3 = points[Math.min(points.length - 1, index + 2)];
    var amount2 = amount * amount;
    var amount3 = amount2 * amount;
    var result = [];
    for (var axis = 0; axis < 3; axis += 1) {
      result[axis] = 0.5 * (
        2 * p1[axis] +
        (-p0[axis] + p2[axis]) * amount +
        (2 * p0[axis] - 5 * p1[axis] + 4 * p2[axis] - p3[axis]) * amount2 +
        (-p0[axis] + 3 * p1[axis] - 3 * p2[axis] + p3[axis]) * amount3
      );
    }
    return result;
  }

  function routeDirection(value, direction) {
    var delta = 0.018;
    var before = sampleRoute(value - delta);
    var after = sampleRoute(value + delta);
    var tangent = normalize3(subtract3(after, before));
    return scale3(tangent, direction < 0 ? -1 : 1);
  }

  function add3(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  }

  function subtract3(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }

  function scale3(vector, amount) {
    return [vector[0] * amount, vector[1] * amount, vector[2] * amount];
  }

  function normalize3(vector) {
    var length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
    return [vector[0] / length, vector[1] / length, vector[2] / length];
  }

  function interpolateDirection(from, to, amount, turnSign) {
    var start = normalize3(from);
    var end = normalize3(to);
    var startYaw = Math.atan2(start[0], start[2]);
    var endYaw = Math.atan2(end[0], end[2]);
    var yawDelta = Math.atan2(Math.sin(endYaw - startYaw), Math.cos(endYaw - startYaw));
    if (Math.abs(Math.abs(yawDelta) - Math.PI) < 0.035) yawDelta = (turnSign < 0 ? -1 : 1) * Math.PI;
    var startPitch = Math.asin(clamp(start[1], -1, 1));
    var endPitch = Math.asin(clamp(end[1], -1, 1));
    var yaw = startYaw + yawDelta * amount;
    var pitch = mix(startPitch, endPitch, amount);
    var horizontal = Math.cos(pitch);
    return [Math.sin(yaw) * horizontal, Math.sin(pitch), Math.cos(yaw) * horizontal];
  }

  function mix3(a, b, amount) {
    return [mix(a[0], b[0], amount), mix(a[1], b[1], amount), mix(a[2], b[2], amount)];
  }

  function polygonArea(points) {
    var sum = 0;
    for (var index = 0; index < points.length; index += 1) {
      var next = (index + 1) % points.length;
      sum += points[index][0] * points[next][1] - points[next][0] * points[index][1];
    }
    return Math.abs(sum) * 0.5;
  }

  function boundsFor(points) {
    var xs = points.map(function (point) { return point[0]; });
    var ys = points.map(function (point) { return point[1]; });
    return {
      left: Math.min.apply(Math, xs),
      right: Math.max.apply(Math, xs),
      top: Math.min.apply(Math, ys),
      bottom: Math.max.apply(Math, ys),
    };
  }

  function perspective(out, fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2);
    out.fill(0);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) / (near - far);
    out[11] = -1;
    out[14] = (2 * far * near) / (near - far);
    return out;
  }

  function lookAt(out, eye, center, up) {
    var z0 = eye[0] - center[0];
    var z1 = eye[1] - center[1];
    var z2 = eye[2] - center[2];
    var length = Math.hypot(z0, z1, z2) || 1;
    z0 /= length; z1 /= length; z2 /= length;

    var x0 = up[1] * z2 - up[2] * z1;
    var x1 = up[2] * z0 - up[0] * z2;
    var x2 = up[0] * z1 - up[1] * z0;
    length = Math.hypot(x0, x1, x2) || 1;
    x0 /= length; x1 /= length; x2 /= length;

    var y0 = z1 * x2 - z2 * x1;
    var y1 = z2 * x0 - z0 * x2;
    var y2 = z0 * x1 - z1 * x0;

    out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
    out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
    out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
    out[12] = -(x0 * eye[0] + x1 * eye[1] + x2 * eye[2]);
    out[13] = -(y0 * eye[0] + y1 * eye[1] + y2 * eye[2]);
    out[14] = -(z0 * eye[0] + z1 * eye[1] + z2 * eye[2]);
    out[15] = 1;
    return out;
  }

  function mix(a, b, amount) {
    return a + (b - a) * amount;
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function smoothstep(edgeA, edgeB, value) {
    var amount = clamp((value - edgeA) / (edgeB - edgeA), 0, 1);
    return amount * amount * (3 - 2 * amount);
  }

  function smootherstep(edgeA, edgeB, value) {
    var amount = clamp((value - edgeA) / (edgeB - edgeA), 0, 1);
    return amount * amount * amount * (amount * (amount * 6 - 15) + 10);
  }

  function softLinear(value, edge) {
    var amount = clamp(value, 0, 1);
    var span = clamp(edge, 0.001, 0.49);
    var speed = 1 / (1 - span);

    function integratedSmootherstep(item) {
      var item2 = item * item;
      var item4 = item2 * item2;
      return item4 * (2.5 - 3 * item + item2);
    }

    if (amount < span) return speed * span * integratedSmootherstep(amount / span);
    if (amount > 1 - span) return 1 - speed * span * integratedSmootherstep((1 - amount) / span);
    return speed * (amount - span * 0.5);
  }

  window.LiminalScene = {
    create: createScene,
    stops: STOPS,
  };
})();
