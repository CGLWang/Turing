$(window).load(function () {

  var regl = createREGL();
  $('html').css('background-color', 'rgba(0,0,0,0)')
  var can = $("canvas")
  // can.width($(window).width())
  // console.log(can.width())
  can.css('z-index', '-99')
  can.css('position', 'fixed')
  // can.css('filter', 'blur(55px)')
  can.fadeOut(0)
  // let gap = 20
  // can.width($(window).width() - gap)
  // can.css('left', gap / 2 + 'px')
  var seed = new Date().getTime() % 1000000;

  var morphAmount = 0;
  window.addEventListener("resize", () => {
    can.width($(window).width())
    // can.height($(window).height())
  });

  // Calling regl() creates a new partially evaluated draw command
  var draw = regl({
    // Shaders in regl are just strings.  You can use glslify or whatever you want
    // to define them.  No need to manually create shader objects.
    frag: `
   precision mediump float;
      #define SEED ${seed}.579831
  
      uniform vec2 uResolution;
      uniform float uTime;
      // uniform vec2 uMouse;
      // uniform float uMorph;
      uniform vec2 uGrid;
  
      const int   complexity  = 10;   // complexity of curls/computation
      // const float mouseSpeed  = 0.05;  // control the color changing
      const float fixedOffset = 1.57;//0.5;  // Drives complexity in the amount of curls/cuves.  Zero is a single whirlpool.
      const float fluidSpeed  = 0.03;  // Drives speed, smaller number will make it slower.
       float baseColor   = 30.0;
      const float BLUR        = 0.47;
  
      #define PI 3.14159
  
      float random(float x) {
        return fract(sin(x) * SEED);
      }
      float noise(float x) {
        float i = floor(x);
        float f = fract(x);
        return mix(random(i), random(i + 1.0), smoothstep(0.0, 1.0, f));
      }
      float noiseS(float x) {
        return noise(x) * 2.0 - 1.0;
      }
  
      void main() {
        vec2 p = (2.0 * gl_FragCoord.xy - uResolution) / min(uResolution.x, uResolution.y) * 0.7;
        float t = uTime * fluidSpeed;
        float noiseTime = noise(t);
        float noiseSTime = noiseS(t);
        float noiseSTime1 = noiseS(t + 1.0);
  
        float blur = (BLUR + 0.14 * noiseSTime);
        for(int i=1; i <= complexity; i++) {
          p += blur / float(i) * sin(
              float(i) * p.yx + t + PI * vec2(noiseSTime, noiseSTime1))
            + fixedOffset;
        }
        for(int i=1; i <= complexity; i++) {
          p += blur / float(i) * cos(
              float(i) * p.yx + t + PI * vec2(noiseSTime, noiseSTime1))
            + fixedOffset;
        }
      //   p += uMouse * mouseSpeed;
      baseColor += baseColor*sin(t);
      float color_range = baseColor;//0.5;
      float base_color = baseColor>1.0?baseColor:1.0-baseColor;//0.5;


        vec2 grid = uGrid * 2.0; // set complexity to 0 to debug the grid
        gl_FragColor = vec4(
          color_range * vec3(
            sin(grid * p + vec2(2.0 * noiseSTime, 3.0 * noiseSTime1)),
            sin(p.x + p.y + noiseSTime)
          )+base_color,
          1.0);
      }
    `,

    vert: '\n    attribute vec2 position;\n    void main () {\n      gl_Position = vec4(position, 0, 1);\n    }\n  ',

    // Here we define the vertex attributes for the above shader
    attributes: {
      // regl.buffer creates a new array buffer object
      position: regl.buffer([[-1, -1], [1, -1], [-1, 1], // no need to flatten nested arrays, regl automatically
      [-1, 1], [1, 1], [1, -1] // unrolls them into a typedarray (default Float32)
      ])

      // regl automatically infers sane defaults for the vertex attribute pointers
    },

    uniforms: {
      uResolution: function uResolution(_ref2) {
        var viewportWidth = _ref2.viewportWidth;
        var viewportHeight = _ref2.viewportHeight;
        return [viewportWidth, viewportHeight];
      },
      uTime: function uTime(_ref3) {
        var tick = _ref3.tick;
        return 0.01 * tick;
      },
      // uMouse: function uMouse() {
      //     return [pointer.position.x, pointer.position.y];
      // },
      uMorph: function uMorph() {
        return morphAmount;
      },
      uRandomSeed: new Date().getTime() % 1000000, //
      uGrid: function uGrid(_ref4) {
        var viewportWidth = _ref4.viewportWidth;
        var viewportHeight = _ref4.viewportHeight;

        var ratio = 1;//0.32;
        return viewportHeight >= viewportWidth ? [1, viewportHeight / viewportWidth * ratio] : [viewportWidth / viewportHeight * ratio, 1];
      }
    },

    // This tells regl the number of vertices to draw in this command
    count: 6
  });

  // regl.frame() wraps requestAnimationFrame and also handles viewport changes
  const _skip_fps = 4;
  var _skip = _skip_fps;


  setTimeout(function () {
    regl.frame(function () {
      _skip -= 1
      if (_skip)
        return;
      _skip = _skip_fps;
      draw();
    });
    // can.css('display','');
    can.fadeIn(3000)
  }, 5000)
  //********************************** */




})