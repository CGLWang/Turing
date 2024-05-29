$(function () {
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
  var in_mobile =
    /(iPhone|iPad|iPod|iOS|Android|SymbianOS|Windows Phone|webOS|BlackBerry)/i.test(
      navigator.userAgent
    );

  var using_dev = "";
  var using_dev_index = -1;
  var mqtt_client_id;
  var mqtt_user_name;
  var mqtt_psw;
  const mqtt_server = "aahqtdc.iot.gz.baidubce.com";
  var mqtt_topics = [];
  const fields = ["mqtt_username", "mqtt_pw"];
  for (let i in fields) {
    let a = $.cookie(fields[i]);
    if (a == undefined || a == "") {
      var got = prompt("please enter your " + fields[i]);
      got = got.replace(/\s/g, "");
      if (got == null) {
        display_hint("no input, cookies are broken");
        return;
      }
      $.cookie(fields[i], got, { expires: 365 });
    }
  }
  mqtt_client_id = $.cookie(fields[0]);
  mqtt_user_name = `thingidp@aahqtdc|${mqtt_client_id}`;
  mqtt_psw = $.cookie(fields[1]);

  let mqtt_opts = {
    onSuccess: onConnect,
    useSSL: true,
    userName: mqtt_user_name,
    password: mqtt_psw,
  };
  var mqtt_online = false;

  var client = new Paho.Client(mqtt_server, 443, mqtt_client_id);
  client.onConnectionLost = onConnectionLost;
  client.onMessageArrived = onMessageArrived;
  client.OnMessageDelivered = OnMessageDelivered;
  client.connect(mqtt_opts);
  $("#chat_log").click(function () {
    $("#send_bar").focus();
  });
  function onConnect() {
    mqtt_online = true;
    for (let i = 0; i < mqtt_topics.length; i++) {
      client.subscribe(mqtt_topics[i]);
      console.log("sub:" + mqtt_topics[i]);
    }
    mqtt_topics = [];
    rx("sys_msg", "connected to cloud\n");
    // border-primary
    $("#send_bar").removeClass("border-danger");
    $("#send_bar").addClass("border-primary");
  }

  function onConnectionLost(responseObject) {
    // if (responseObject.errorCode !== 0)
    mqtt_online = false;
    let s = "onConnectionLost:" + responseObject.errorMessage;
    console.log("onConnectionLost:" + responseObject.errorMessage);
    display_hint(s);
    rx("sys_msg", "disconnected to cloud");
    $("#send_bar").removeClass("border-primary");
    $("#send_bar").addClass("border-danger");
    client.connect(mqtt_opts);
  }
  var bin_stack = [];

  function onMessageArrived(message) {
    if (/lily\/dev1\/bin\/(\d+)\/(\d+)\/(\d+)/.test(message.topic)) {
      var msg = message.payloadBytes;
      // console.log(message.topic + ':' + msg.length)
      var bid = RegExp.$1;
      var segn = RegExp.$2;
      var seg = RegExp.$3;
      if (!bin_stack) {
        if (seg != "0") {
          console.error("glitch");
          return;
        }
        bin_stack = bin_stack.concat(Array.from(msg));
      } else {
        bin_stack = bin_stack.concat(Array.from(msg));
      }
      var pic_size = bin_stack.length;
      if (segn == seg) {
        // pic there
        var blob = new Blob([Uint8Array.from(bin_stack)], {
          type: "image/png",
        });
        var url = URL.createObjectURL(blob);
        document.getElementById("img_can").src = url;
        img_tick(bid, pic_size);
        bin_stack = [];
      } else {
      }
      return;
    }
    try {
      rx(message.topic, message.payloadString);
    } catch (err) {
      display_hint(err);
    }
  }

  var last_img_tick = new Date().getTime();
  function img_tick(pid, pic_size) {
    if ($("#img_panel").hasClass("d-none")) {
      $("#img_panel").removeClass("d-none").show(800);
    }
    var now = new Date().getTime();
    var dt = now - last_img_tick;
    var fps = 1000 / dt;
    last_img_tick = now;
    $("#p_fps").text(fps.toFixed(1) + "fps");
    $("#p_pid").text("pid:" + pid);
    $("#p_size").text("size:" + (pic_size / 1024).toFixed(2) + "Kb");
  }
  $("#b_refresh").click(function () {
    tx("cap");
  });
  $("#b_video").click(function () {
    var s = $(this).text();
    if (s.indexOf("video") >= 0) {
      tx("cap on");
      $(this).removeClass("btn-primary").addClass("btn-outline-primary");
      $(this).text(">picture");
    } else {
      tx("cap off");
      $(this).removeClass("btn-outline-primary").addClass("btn-primary");
      $(this).text(">video");
    }
  });

  $("#b_close").click(function () {
    $("#img_panel").hide(800, function () {
      $(this).addClass("d-none");
    });
  });
  $("#b_blur").click(function () {
    var s = $(this).text();
    if (s.indexOf("blur") >= 0) {
      $("#img_can").css("filter", "blur(10px)");
      $(this).removeClass("btn-primary").addClass("btn-outline-primary");
      $(this).text("clear");
    } else {
      $("#img_can").css("filter", "");
      $(this).removeClass("btn-outline-primary").addClass("btn-primary");
      $(this).text("blur");
    }
  });

  function OnMessageDelivered(a, b) {
    console.log(a);
    console.log(b);
  }

  window.addEventListener("resize", () => {});
  var ansi_up = new AnsiUp();
  function filter(msg) {
    msg = ansi_up.ansi_to_html(msg);
    let from = ["\r", "<", ">"];
    let to = ["", "&lt;", "&gt;"];
    for (let i = 0; i < from.length; i++) {
      msg = msg.replace(from[i], to[i]);
    }
    return msg;
  }

  function tx(msg) {
    if (!mqtt_online) return -1;
    if (using_dev == "") {
      display_hint("no device selected");
      return -2;
    }
    if (!msg.endsWith("\n")) {
      msg += "\n";
    }
    let message = new Paho.Message(msg);
    message.destinationName = "lily/" + using_dev + "/cmd";
    console.log("pub:" + message.destinationName + "," + msg);
    client.send(message);
    display_hint("@" + using_dev + ":" + msg);
    return 0;
  }

  function chat_logs(msg) {
    let el = $("#chat_log");
    el.append(msg);
    let h = el.prop("scrollHeight");
    el.scrollTop(h);
  }

  var last_display_dev = "";
  var last_time_display_dev = new Date();

  var type_queue = [];
  var type_cursor = -1;

  function wrong_type() {
    $("#send_bar").addClass("animate__animated animate__pulse animate__faster");
  }

  function push_type(t) {
    type_queue.push(t);
    if (type_queue.length > 100) {
      type_queue.shift();
    }
    type_cursor = type_queue.length; // the latest item
  }

  function last_type() {
    let i = type_cursor - 1;
    if (i < 0) {
      i = 0;
      wrong_type();
    }
    type_cursor = i;
    return type_queue[i];
  }

  function next_type() {
    let i = type_cursor + 1;
    if (i >= type_queue.length) {
      wrong_type();
      return "";
    }
    type_cursor = i;
    return type_queue[i];
  }

  function rx(tpc, msg) {
    // if (!msg.endsWith("\n")) {
    //   if (msg.length > 10)
    //     msg += "\n";
    // }
    msg = filter(msg);
    // let pat = /lily\/(\w+)\/msg/
    // if (pat.test(tpc)) {
    //   tpc = RegExp.$1;
    //   let now_t = new Date();
    //   if (last_display_dev == tpc && parseInt(now_t - last_time_display_dev) < 5000) {
    //     tpc = '';
    //   } else {
    //     last_display_dev = tpc;
    //     last_time_display_dev = now_t;
    //     tpc = '<b class="green">$' + tpc + ": </b>";
    //   }
    // } else {
    //   tpc = '<b class="green">' + tpc + ": </b>";
    // }
    chat_logs(msg);
  }

  function display_hint(msg) {
    $("#hint").html(msg);
  }

  function send_msg_out() {
    let msg = $("#send_bar").val();
    if (msg == "") {
      wrong_type();
      return;
    }
    msg += "\n";
    let ok = tx(msg);
    push_type(msg);
    if (ok < 0) {
      display_hint("failed to send msg, code=" + ok);
    } else {
      $("#send_bar").val("");
      let el = '<b class="text-primary atxt">&gt;&gt;' + filter(msg) + "</b>";
      chat_logs(el);
      chat_logs("<br>");
    }
  }
  $("#send_btn").click(send_msg_out);
  $("#clear_btn").click(function () {
    $("#chat_log").empty();
  });

  $("#send_bar").on("keyup", function (e) {
    let k = e.keyCode;
    if (k == 13) {
      send_msg_out();
      return;
    }
    if (k == 38) {
      // up
      let s = last_type();
      $(this).val(s);
      return;
    }
    if (k == 40) {
      //down
      let s = next_type();
      $(this).val(s);
      return;
    }
  });

  // to fetch msg animate__pulse
  $("#top_dev").on("animationend", function () {
    $(this).removeClass("animate__animated animate__flip animate__faster");
  });
  $("#send_bar").on("animationend", function () {
    $(this).removeClass("animate__animated animate__pulse animate__faster");
  });

  var d_namesx = $("#devices_avaliable .dname");
  var d_names = [];
  var d_logs = [];
  if (d_namesx.length > 0) {
    for (let i = 0; i < d_namesx.length; i++) {
      let ss = d_namesx[i].innerText.trim();
      let ii = ss.indexOf(":");
      if (ii >= 0) {
        ss = ss.substr(ii + 1);
      }
      d_names.push(ss);
      d_logs.push("");
    }
    using_dev_index = 0;
    using_dev = d_names[using_dev_index];
    $("#devices_avaliable > tr:first").addClass("bg-light");
    $("#devices_avaliable > tr").children;
    let ss = using_dev;
    $("#top_dev").html(ss);
    $("chat_log").html(d_logs[using_dev_index]);

    mqtt_topics.push("lily/" + using_dev + "/msg");
    mqtt_topics.push("control/upload/" + using_dev);

    $("#devices_avaliable > tr").each(function (i, self) {
      $(this).click(function () {
        if (i == using_dev_index) return;
        d_logs[using_dev_index] = $("#chat_log").html();
        // unsub last device
        if (mqtt_online && using_dev) {
          client.unsubscribe("lily/" + using_dev + "/msg");
          client.unsubscribe("control/upload/" + using_dev);
          client.unsubscribe("lily/" + using_dev + "/bin/#");
          console.log("unsub:" + "lily/" + using_dev + "/msg");
        }
        using_dev = d_names[i];
        if (mqtt_online && using_dev) {
          client.subscribe("lily/" + using_dev + "/msg");
          client.subscribe("control/upload/" + using_dev);
          client.subscribe("lily/" + using_dev + "/bin/#");
          console.log("sub:" + "lily/" + using_dev + "/msg");
        }
        $("#devices_avaliable > tr")[using_dev_index].classList.remove(
          "bg-light"
        );
        using_dev_index = i;
        $(this).addClass("bg-light");
        // $("#top_dev").removeClass("animate__animated animate__flip")
        var ss = using_dev;
        var ii = ss.indexOf(":");
        if (ii >= 0) {
          ss = ss.substr(ii + 1);
        }
        $("#top_dev").html(ss);
        $("#top_dev").addClass(
          "animate__animated animate__flip animate__faster"
        );
        $("#chat_log").html(d_logs[using_dev_index]);
      });
    });
  }

  $("#add_dev_btn").click(function () {
    $("#dev_ids").val("");
    $("#new_dev_modal .row span").text(
      "please enter your device ID, if you have more than one device, seprate them with comma"
    );
    $("#modal_add_btn").attr("disabled", null);
    $("#new_dev_modal").modal("show");
    $("#dev_ids").focus();
  });

  $("#modal_add_btn").click(function () {
    let s = $("#dev_ids").val();
    if (!s) return;
    s = s.replace(/\s/, "");
    $(this).attr("disabled", "true");
    console.log(s);
    d_names.push(s);
    d_logs.push("");
    $new_tr = $(`<tr class="border-bottom align-items-center my-2">
      <td>
          <div class="w-100">
              <div class="d-flex align-items-center">
                  
                  <i class=" bi-circle-fill text-muted invisible" style="font-size: 0.3rem;"></i>
                  
                  <p class="my-1 mx-2  text-wrap dname">${s}
                  </p>
              </div>
              <div class="d-flex justify-content-end">
                  <small class="mb-0 mx-1 ">2022-10-26 12:42:50</small>
              </div>
          </div>
      </td>
      </tr>`);
    let this_tr_index = d_names.length - 1;
    $new_tr.click(function () {
      if (this_tr_index == using_dev_index) return;
      d_logs[using_dev_index] = $("#chat_log").html();
      // unsub last device
      if (mqtt_online && using_dev) {
        client.unsubscribe("lily/" + using_dev + "/msg");
        client.unsubscribe("lily/" + using_dev + "/bin/#");
        console.log("unsub:" + "lily/" + using_dev + "/msg");
      }
      using_dev = s;
      if (mqtt_online && using_dev) {
        client.subscribe("lily/" + using_dev + "/msg");
        client.subscribe("lily/" + using_dev + "/bin/#");
        console.log("sub:" + "lily/" + using_dev + "/msg");
      }
      $("#devices_avaliable > tr")[using_dev_index].classList.remove(
        "bg-light"
      );
      using_dev_index = d_names.length - 1;
      $(this).addClass("bg-light");
      $("#top_dev").html(using_dev);
      $("#top_dev").addClass("animate__animated animate__flip animate__faster");
      $("#chat_log").html(d_logs[using_dev_index]);
    });
    $("#devices_avaliable").append($new_tr);
    $("#dev_lists").getNiceScroll().resize();
    $("#new_dev_modal").modal("hide");
  });
  $("#del_dev_btn").click(function () {
    $("#rm_dev_modal").modal("show");
  });
  $("#modal_rm_btn").click(function () {
    $("#devices_avaliable >tr")[using_dev_index].remove();
    d_names.splice(using_dev_index, 1);
    d_logs.splice(using_dev_index, 1);
    using_dev_index = 0;
    using_dev = d_names[using_dev_index];
    $("#devices_avaliable > tr")[using_dev_index].classList.add("bg-light");
    $("#top_dev").html(using_dev);
    $("#chat_log").html(d_logs[using_dev_index]);

    let self = $(this);
    self.attr("disabled", "true");
    $("#rm_dev_modal").modal("hide");
  });

  var url_logout = "/account/logout/";
  var url_auth = "/account/auth/";

  function logout_this_account() {
    let token = $.cookie("utoken");
    if (!token) {
      display_hint("got a problem(-226)");
      return;
    }
    $.get(url_logout, function (data, status) {
      if (status != "success") {
        display_hint("some thing went wrong(" + status + ")");
      }
      $.removeCookie("username");
      $.removeCookie("uname");
      $.removeCookie("utoken");
      $.removeCookie("mqtt_us");
      $.removeCookie("mqtt_pw");
      $.removeCookie("mqtt_name");
      // redirect
      window.location.href = "/";
      return;
    });
  }
  $("#out_btn").click(logout_this_account);

  if (!in_mobile) $("#chat_log").niceScroll();
  $("#dev_lists").niceScroll();

  function go_my_account() {
    var url = "/pulls/my/";
    window.location.href = url;
  }
});
