var intention = "";

function csrfSafeMethod(method) {
  // these HTTP methods do not require CSRF protection
  return /^(GET|HEAD|OPTIONS|TRACE)$/.test(method);
}

function sameOrigin(url) {
  // test that a given url is a same-origin URL
  // url could be relative or scheme relative or absolute
  var host = document.location.host; // host + port
  var protocol = document.location.protocol;
  var sr_origin = "//" + host;
  var origin = protocol + sr_origin;
  // Allow absolute or scheme relative URLs to same origin
  return (
    url == origin ||
    url.slice(0, origin.length + 1) == origin + "/" ||
    url == sr_origin ||
    url.slice(0, sr_origin.length + 1) == sr_origin + "/" ||
    // or any other URL that isn't scheme relative or absolute i.e relative.
    !/^(\/\/|http:|https:).*/.test(url)
  );
}
$.ajaxSetup({
  beforeSend: function (xhr, settings) {
    if (!csrfSafeMethod(settings.type) && sameOrigin(settings.url)) {
      // Send the token to same-origin, relative URLs only.
      // Send the token only if the method warrants CSRF protection
      // Using the CSRFToken value acquired earlier
      let s = $.cookie("csrftoken");
      let csrftoken = $('input[name="csrfmiddlewaretoken"]').val();
      if (s) {
        csrftoken = s;
      }
      xhr.setRequestHeader("X-CSRFToken", csrftoken);
    }
  },
});

$(function () {
  var sys_status = "start";
  var chart_view_reached = false;
  var option_reset = false;
  var option = {
    title: {
      text: "---",
    },
    tooltip: {
      show: true,
      trigger: "axis",
      axisPointer: {
        type: "line",
        axis: "auto",
        snap: true,
      },
    },
    legend: {
      top: "6%",
      data: ["max", "min", "average"],
      selected: {
        max: false,
        min: false,
      },
    },
    // toolbox: {
    // feature: {
    // dataView: { //数据视图
    //   show: true
    // },
    // dataZoom: { //数据缩放视图
    //   show: true
    // },
    //     saveAsImage: { //保存图片
    //       show: true
    //     },
    //   }
    // },
    dataZoom: [{
        type: "slider",
        // start: 50,
        minSpan: 5,
      },
      // {
      //   type: 'inside',
      //   // start: 50,
      //   // zoomOnMouseWheel: 'ctrl',
      //   // moveOnMouseWheel: 'shift',
      //   minSpan: 5
      // }
    ],
    grid: {
      left: 10,
      containLabel: true,
      bottom: "11%",
      top: "13%",
      right: 10,
    },
    xAxis: [{
      type: "time",
      splitNumber: 7,
    }, ],
    yAxis: [{
      type: "value",
      scale: true,
    }, ],
    series: [{
        name: "max",
        type: "line",
        smooth: true,
        // areaStyle: {},
        symbol: "none",
        emphasis: {
          focus: "series",
        },
        data: [],
      },
      {
        name: "min",
        type: "line",
        symbol: "dot",
        smooth: true,
        // areaStyle: {},
        emphasis: {
          focus: "series",
        },
        data: [],
      },
      {
        name: "average",
        type: "bar",
        symbol: "none",
        areaStyle: {},
        emphasis: {
          focus: "series",
        },
        data: [],
      },
    ],
  };

  var charts = [];
  var charts_ctx = ["chart1", "chart2", "chart3"];
  var charts_data = [
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
    [
      [],
      [],
      []
    ],
  ]; // 3 series for each chart, 3x3 Array
  var charts_x_data = [
    [],
    [],
    []
  ]; // axis-X time line
  for (let i = 0; i < 3; i++) {
    let chartDom = document.getElementById(charts_ctx[i]);
    let chart = echarts.init(chartDom);
    chart.setOption(option);
    charts.push(chart);
  }
  window.addEventListener("resize", function () {
    update_on_scroll();
    for (let i in charts) {
      charts[i].resize();
    }
  });

  $(window).scroll(update_on_scroll);

  function update_on_scroll() {
    let vh = $(window).height();
    let chart_y = $("#chart1").offset().top;
    let chart_h = $("#chart1").height();
    let y = $(document).scrollTop();

    if (!chart_view_reached && chart_y - y + chart_h / 2 < vh) {
      //visable
      chart_view_reached = true;
      if (sys_status == "start") {
        return;
      }
      if (!selected_dev) return;
      get_samples(selected_dev, from_time, current_date, time_step, 725);
    }
  }
  update_on_scroll(); // first call to determine chart_view_reached
  //  2022-02-17 10:02:06
  function current_date_time(now, d_day, d_hour, d_min) {
    d_day = d_day || 0;
    d_hour = d_hour || 0;
    d_min = d_min || 0;
    if (!now) now = new Date();
    let delta = (d_day * 24 * 60 + d_hour * 60 + d_min) * 60000;
    now = new Date(now.getTime() + delta);
    let date = [now.getMonth() + 1, now.getDate()];
    let s = "" + now.getFullYear();
    for (let i in date) {
      let sn = "" + date[i];
      if (sn.length < 2) sn = "0" + sn;
      s += "-" + sn;
    }
    s += " ";
    let h = now.getHours() + "";
    if (h.length < 2) h = "0" + h;
    s += h;
    date = [now.getMinutes(), now.getSeconds()];
    for (let i in date) {
      let sn = "" + date[i];
      if (sn.length < 2) sn = "0" + sn;
      s = s + ":" + sn;
    }
    return s;
  }

  var current_date = current_date_time();
  var now_sel = $("#btns_timer_step .btn:first");
  var selected_dev = "dev2";
  var show_trends = false;
  var dtp = new Date();
  var from_time = current_date_time(
    null,
    -1,
    -dtp.getHours(),
    -dtp.getMinutes()
  );
  //
  // hour, day, week, month
  // 1min, 15min, 1hour, 8hour, 1day, 7days, 1month
  //  1hour, 12hour, 1day, 7days
  var tp = ["0,3600",  "1,0", "7,0"];//"0," + 3600 * 8,
  var since_from_times_option = [-1,  -30, -365];//-7,
  var time_step = tp[0];
  var on_load_dev_data = false;
  $("#selected_dev>strong").html(selected_dev);
  $("#selected_dev").on("animationend", function () {
    $(this).removeClass("animate__animated animate__bounce");
    if (on_load_dev_data) {
      setTimeout(function () {
        $("#selected_dev").addClass("animate__animated animate__bounce");
      }, 500);
    }
  });

  const urls = ["/pulls/my/", "/intouch", "/my", "/scope/"];
  var apps = $(".app");

  apps.each(function (i, e) {
    $(this).click(function () {
      let uid = $.cookie("uname");
      if (!uid) {
        // $('#modal_login').modal('show');
        if ($("#modal_login").modal) {
          $("#modal_login").modal("show");
        } else {
          var myModalEl = document.getElementById("modal_login");
          var modal = bootstrap.Modal.getInstance(myModalEl);
          modal.show();
        }
        intention = urls[i];
        return;
      }
      let dest = urls[i];
      window.location.href = dest;
    });
  });

  $("#btns_timer_step .btn").click(function () {
    if (show_trends) return;
    if (now_sel == $(this) || on_load_dev_data) return;
    on_load_dev_data = true;
    now_sel.removeClass("btn-primary");
    $(this).addClass("btn-primary");
    now_sel = $(this);
    let st = $(this).html();
    let ts = [ "Day", "Week", "Month"];//"Hour",
    let time_line_from = -1;
    for (let i = 0; i < ts.length && i < 10; i++) {
      if (st == ts[i]) {
        st = tp[i];
        time_line_from = since_from_times_option[i];
        break;
      }
    }
    var dtp = new Date();
    from_time = current_date_time(
      null,
      time_line_from,
      -dtp.getHours(),
      -dtp.getMinutes()
    );
    time_step = st;
    current_date = current_date_time();
    $("#selected_dev").addClass("animate__animated animate__bounce");
    get_samples(selected_dev, from_time, current_date, time_step, 725);
  });

  $("#trends_btn").click(function () {
    if (time_step != '0,3600') return;
    if (on_load_dev_data) return;
    show_trends = !show_trends;
    $("#trends_btn>div").toggleClass("bg-warning");
    $("#trends_btn>div>strong").toggleClass("text-white text-warning");
    if (show_trends) {
      show_data_trends(charts_data);
    } else {
      show_data_statistics(charts_data);
    }
  });

  function parse_from(s) {
    let o = null;
    try {
      o = JSON.parse(s);
    } catch (err) {
      return s;
    }
    let c = "";
    for (let i in o) {
      c += i + "=" + o[i] + ",";
    }
    return c.substr(0, c.length - 1);
  }

  function dev_add(no, name, tag, count, time, status, nick) {
    let state = "";
    if (status == 0) {
      state = "text-muted";
    }
    tag = parse_from(tag);
    let dev_ids = "__" + name;
    if (!nick) {
      nick = name;
    }
    let format =
      "<tr id='" +
      dev_ids +
      "' class='" +
      state +
      "'>" +
      "<td class='text-truncate fw-bold'>" +
      nick +
      "</td>\
    <td class='dev_msg_tag text-truncate'>" +
      tag +
      "</td>\
    <td class='dev_msg_count text-truncate'>" +
      count +
      "</td>\
    <td class='dev_msg_time text-truncate'>" +
      time +
      "</td>\
  </tr >";
    $row = $(format);
    $row.click(function () {
      if (selected_dev == name || on_load_dev_data) return;
      on_load_dev_data = true;
      selected_dev = name;
      $("#selected_dev").addClass("animate__animated animate__bounce");
      $("#selected_dev>strong").html(selected_dev);
      current_date = current_date_time();
      get_samples(selected_dev, from_time, current_date, time_step, 725);
    });
    $("#dev_table").append($row);
  }

  // function shine_bubble() {
  //   $("#bubble").removeClass('invisible')
  //   setTimeout(() => {
  //     $("#bubble").addClass('invisible')
  //   }, 2000);
  // }

  function update_device_status(name, tag, count, time, status) {
    let row = "#__" + name;
    tag = parse_from(tag);
    let r = $(row);
    $(row + " .dev_msg_tag").html(tag);
    let last = $(row + " .dev_msg_count").text();
    if (last != count) {
      $(row + " .dev_msg_count").text(count);
      r.addClass("animate-warning");
    }
    $(row + " .dev_msg_time").html(time);
    // let s = $(row + ' .fw-bold')
    if (status == 0) {
      r.addClass("text-muted");
      // s.addClass('text-danger')
      // status = "offline"
    } else {
      r.removeClass("text-muted");
      // s.addClass('text-success')
      // status = "online"
    }
    // s.html(status)
    // shine_bubble()
  }

  function get_devices(dev, change_dev) {
    dev = dev || "*";
    change_dev = change_dev || true;

    if (sys_status != "start") return;
    let first_device = "";
    let pack = {
      device: dev,
    };
    let ok = jQuery.post("/polls/devs/", pack, function (response) {
      sys_status = "device_done";

      $("#dev_table").empty();
      var devs = response["device"];
      for (let i = 0; i < devs.length; i++) {
        let d = devs[i];
        // 2022-01-19T19:03:10
        let r = /^\d{4}-(\d{2}-\d{2})T(\d{2}:\d{2}):\d{2}$/;
        r.exec(d[3]);
        let t = RegExp.$1 + " " + RegExp.$2;
        dev_add(i + 1, d[0], d[1], d[2], t, d[4], d[5]);
      }
      if (devs.length > 0 && change_dev) {
        first_device = devs[0][0];
        selected_dev = first_device;
        $("#selected_dev>strong").html(selected_dev);
        $("#selected_dev").addClass("animate__animated animate__bounce");
        on_load_dev_data = true;
        // first load samples
        if (chart_view_reached)
          get_samples(selected_dev, from_time, current_date, time_step, 725);
        setInterval(update_devices, 10000);
      }
      $("tr").on("animationend", function () {
        $(this).removeClass("animate-warning");
      });
    });
    return first_device;
  }

  function update_devices() {
    let pack = {
      device: "*",
    };
    jQuery.post("/polls/devs/", pack, function (response) {
      var devs = response["device"];
      for (let i = 0; i < devs.length; i++) {
        let d = devs[i];
        // 2022-01-19T19:03:10
        let r = /^\d{4}-(\d{2}-\d{2})T(\d{2}:\d{2}):\d{2}$/;
        r.exec(d[3]);
        let t = RegExp.$1 + " " + RegExp.$2;
        // name, tag, count, time, status
        update_device_status(d[0], d[1], d[2], t, d[4]);
      }
    });
  }

  get_devices();

  function push(x, v) {
    for (let i = 0; i < charts.length; i++) {
      charts_x_data[i].push(x);
      for (let j = 0; j < 3; j++) {
        // chart i, series j
        charts_data[i][j].push([x, v[j][i]]);
      }
    }
  }

  function show_data_trends(charts_data) {
    // var charts_data = Array.from(_charts_data);
    var now_time = new Date();
    now_time -=
      now_time.getHours() * 3600000 +
      now_time.getMinutes() * 60000 +
      now_time.getSeconds() * 1000 +
      now_time.getMilliseconds();
    for (let i in charts) {
      var ds = Array.from(charts_data[i][2]);
      var j = 0;
      for (j in ds) {
        var d = ds[j];
        if (d[0] - now_time < 0) {
          ds[j] = Array.from(ds[j])
          ds[j][0] = new Date(d[0].getTime() + 86400000); // add one day
        } else {
          break;
        }
      }
      var option2 = charts[i].getOption()
      option2['legend']['data'] = []
      option2['legend']['selected'] = {}
      option2['series'] = []

      charts[i].setOption(option2, true)

      charts[i].setOption({
        legend: {
          top: "6%",
          data: ["history", "today"],
        },
        series: [{
            name: "history",
            type: "line",
            symbol: "none",
            smooth: true,
            data: ds.slice(0, j),
            lineStyle: {
              normal: {
                color: "#888",
                width: 4,
                type: "dashed",
              },
            },
          },
          {
            name: "today",
            type: "line",
            symbol: "none",
            smooth: true,
            data: ds.slice(j),
            areaStyle: {
              color: "#ffc107",
              smooth: true,
              opacity: 0.5,
            },
            lineStyle: {
              normal: {
                color: "#ffc107",
                width: 4,
                type: "solid",
              },
            },
          },
        ],
      });
    }
    option_reset = true;
  }

  function show_data_statistics(charts_data) {
    if (option_reset) {
      for (var chart of charts) {
        var option2 = chart.getOption()
        // option2['legend']['data'] = ["max", "min", "average"]
        // option2['legend']['selected'] = {
        //   max: false,
        //   min: false,
        // }
        option2['legend'] = {}
        option2['series'] = []
        chart.setOption(option2, true)
      }
      option_reset = false;
    }
    // option
    for (let i in charts) {
      charts[i].setOption({
        legend: {
          top: "6%",
          data: ["max", "min", "average"],
          selected: {
            max: false,
            min: false,
          },
        },
        series: [{
            name: "max",
            type: "line",
            smooth: true,
            // areaStyle: {},
            symbol: "none",
            emphasis: {
              focus: "series",
            },
            data: charts_data[i][0],
          },
          {
            name: "min",
            type: "line",
            symbol: "dot",
            smooth: true,
            // areaStyle: {},
            emphasis: {
              focus: "series",
            },
            data: charts_data[i][1],
          },
          {
            name: "average",
            type: "bar",
            symbol: "none",
            emphasis: {
              focus: "series",
            },
            data: charts_data[i][2],
          },
        ],
      });
    }
  }

  function get_samples(dev_name, from, to, time_step, sample_limit) {
    time_step = time_step || "0,1800";
    sample_limit = sample_limit || 500;
    charts_data = [
      [
        [],
        [],
        []
      ],
      [
        [],
        [],
        []
      ],
      [
        [],
        [],
        []
      ],
    ]; // 3 series for each chart, 3x3 Array
    charts_x_data = [
      [],
      [],
      []
    ]; // axis-X time line
    var isok = jQuery.post(
      "/polls/search/", {
        device: dev_name,
        from_time: from,
        to_time: to,
        step: time_step,
        limit: sample_limit,
      },
      function (response) {
        let ok = response["ok"];
        if (ok < 0) {
          display_hint("sorry we met a glitch.//" + response["error"]);
          on_load_dev_data = false;
          return;
        }
        var data = response[dev_name];
        var ts = data["time"];
        var vals = data["data"]; // [0,1,2]
        var tag = data["tag"];
        display_hint(ts.length + " points");
        if (ts.length > 0) {
          for (let i = 0; i < 3; i++) {
            //set title here
            let oop = {
              title: {
                text: tag[i],
              },
            };
            charts[i].setOption(oop);
          }
        }
        for (let i = 0; i < ts.length; i++) {
          let t = new Date(ts[i]);
          let v = vals[i];
          push(t, v);
        }
        if (show_trends) {
          show_data_trends(charts_data);
        } else {
          show_data_statistics(charts_data);
        }
        on_load_dev_data = false;
      }
    );
  }
});

var _in_turing = false;
var _msg = "";

function _turn_out() {
  $("#hint").text(_msg);
  $("#hint").fadeIn(300);
  _in_turing = false;
}

function display_hint(msg) {
  if (_in_turing) {
    _msg = _msg + "|" + msg;
    return;
  }
  _msg = msg;
  _in_turing = true;
  $("#hint").fadeOut(300, _turn_out);
}