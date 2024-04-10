var _login_intention = null // call after login
var _login_modal_seted = null

var url = "/account/login/"
var url_auth = "/account/auth/"
var url_logout = "/account/logout/"
var auth_times = 0
var fresh_us = false;
var fresh_ht = false;
var pw = "";
var us = "";


function check_if_authed(callback_yes, callback_no) {
    let token = $.cookie('utoken')

    if (!token) {
        if (callback_no)
            callback_no('no')
    } else {
        auth_times += 1
        // verify auth
        $.post(url_auth, {
            auth_time: auth_times
        }, function (data, status) {
            let ok = false;
            if (status != "success") {
                display_hint('some thing went wrong(' + status + ")")
            } else if (data == "ok") {
                ok = true
            }
            if (ok) {
                if (callback_yes)
                    callback_yes('yes')
                return;
            }
            // not ok
            $.removeCookie('uname')
            $.removeCookie('utoken')
            if (callback_no)
                callback_no('no')
        })
    }
}

function logout_account() {
    let token = $.cookie('utoken')
    if (!token) {
        display_hint("got a problem(-226)")
        return;
    }
    $.get(url_logout, function (data, status) {
        if (status != "success") {
            display_hint('some thing went wrong(' + status + ")")
        }
        $.removeCookie('username')
        // $.removeCookie('uname')
        $.removeCookie('utoken')
        $.removeCookie('mqtt_us')
        $.removeCookie('mqtt_pw')
        $.removeCookie('mqtt_name')
        return;
    })
}


function hide_view(hide = true) {
    if (hide) {
        $("#home_view")[0].style.filter = "blur(47.2px) brightness(90%)"
        $('footer').fadeOut()
        $("#loader_div").show();
    } else {
        $("#loader_div").hide();
        $("#home_view")[0].style.filter = ""
        $('footer').fadeIn()
    }
}

function genrate_login_window() {
    if ($('#modal_login').length) {
        
        return;
    }
    const _modal_html = '<div class="modal fade" id="modal_login" data-bs-backdrop="false" data-bs-keyboard="false"> \
    <div class="modal-dialog"> \
        <div class="modal-content shadow-lg r-15"> \
            <div class="modal-header"> \
                <h5 class="modal-title">Sign in to Canary</h5> \
            </div> \
            <div class="modal-body"> \
                <div class="container-fluid"> \
                    <div class="row align-items-center justify-content-center"> \
                        <div class=" col-sm-4 col-md-3 col-lg-3 align-self-center mt-2"> \
                            <div class="d-flex justify-content-center align-items-center"> \
                                <a href="/account/regist/"> \
                                    <img src="/static/assets/images/icloud_logo_sm.png" \
                                        class="img-fluid img-thumbnail shadow rounded-circle" \
                                        style="width: 80px;height: 80px;"> \
                                </a> \
                            </div> \
                        </div> \
                        <div class="col-sm-10 col-md-9 col-lg-9 align-self-center mt-2"> \
                            <div class="row"> \
                                <input \
                                    class="animate__animated rounded-3 shadow border border-none text input-large" \
                                    type="text" id="user_id" name="user_id" placeholder="Canary ID" \
                                    style="height: 40px;" /> \
                            </div> \
                            <div class="row mt-2"> \
                                <input class="animate__animated rounded-3 shadow border border-light" \
                                    type="password" id="password" name="user_name" placeholder="password" \
                                    style="height: 40px;" /> \
                            </div> \
                        </div> \
                    </div> \
 \
                </div> \
 \
            </div> \
            <div class="modal-footer"> \
                <button type="button" class="btn btn-default" data-bs-dismiss="modal">Cancel \
                </button> \
                <button type="button" class="btn btn-primary" id="signin_btn" disabled> \
                    Sign in \
                </button> \
            </div> \
        </div> \
    </div> \
</div> \
</div>'
    let el = $(_modal_html)
    $('html').append(el)
}

function echo_login_window() {
    genrate_login_window()
    login_modal_setup()
    $('#modal_login').modal('show')

}

function post_login() {
    var pu = $("#user_id")
    us = pu.val()
    if (us == "" || us.indexOf(" ") >= 0) {

        if (!pu.hasClass("animate__headShake")) {
            pu.addClass("animate__animated animate__headShake")
        }

        let msg_ = "user name is invalid"
        $("#user_id").addClass("border-danger")
        fresh_us = true;
        let ht = $(".modal-header > .modal-title")
        ht.html(msg_)
        ht.addClass("text-danger")
        fresh_ht = true;
        return {
            ok: -1,
            msg: msg_
        }
    }
    if (pw == "") {
        let msg_ = "password is invalid"
        let ht = $(".modal-header > .modal-title")
        ht.html(msg_)
        ht.addClass("text-danger")
        fresh_ht = true;
        return {
            ok: -2,
            msg: msg_
        }
    }

    let sid = $.cookie('csrftoken')
    if (sid == undefined || sid == "") {
        display_hint('bad no sid')
        let msg_ = "error:no csrfToken"
        let ht = $(".modal-header > .modal-title")
        ht.html(msg_)
        ht.addClass("text-danger")
        fresh_ht = true;
        return;
    }
    let pwd = md5(us + pw);
    let hexHash = md5(pwd + sid);
    $.post(url, {
        name: us,
        password: hexHash
    }, function (data, status) {
        pw = ""
        let ph = $("#password")
        ph.val("");
        if (status != "success") {
            let msg_ = "sorry we met a problem"
            let ht = $(".modal-header > .modal-title")
            ht.html(msg_)
            ht.addClass("text-danger")
            fresh_ht = true;
            return;
        }
        if (data == "ok") {
            $.cookie('username', us, {
                expires: 1
            });
            $('#modal_login').modal('hide')
            if (_login_intention)
                _login_intention()

        } else {
            if (!ph.hasClass("animate__headShake")) {
                ph.addClass("animate__animated animate__headShake")
            }
            let msg_ = "either username or password is incorrect"
            let ht = $(".modal-header > .modal-title")
            ht.html(msg_)
            ht.addClass("text-danger")
            fresh_ht = true;
            return;
        }
    })
    $("#signin_btn").attr('disabled', true)
    return {
        "ok": 0,
        msg: "passed"
    }
}

function update_pu() {
    us = $("#user_id").val()
    if (pw == "" || us == "") {
        $("#signin_btn").attr('disabled', true)
    } else {
        $("#signin_btn").attr('disabled', false)
    }
    if (fresh_us) {
        $("#user_id").removeClass("border-danger");
    }
    if (fresh_ht) {
        let ht = $(".modal-header > .modal-title");
        ht.removeClass("text-danger")
        ht.html("Sign in to Canary")
    }
}

function login_modal_setup() {
    $('#modal_login').modal({
        backdrop: false,
        keyboard: false
    })
    $('#modal_login').on('show.bs.modal', function () {
        hide_view();
    })
    $('#modal_login').on('hidden.bs.modal', function () {
        hide_view(false);
    })

    $("#user_id").on('input', update_pu)

    $("#password").on('keypress', function (e) {
        if (e.keyCode == 13) {
            pw = $(this).val();
            if (us == "" || pw == "")
                return;
            post_login();
        }
    })

    $("#password").on('input', function (e) {
        pw = $(this).val();
        update_pu();
    })

    $("#signin_btn").click(function () {
        post_login();
    })
}

$(function () {
    
    $(window).load(
        function () {
            genrate_login_window()
            login_modal_setup()
            if (_login_modal_seted)
                _login_modal_seted()
        }
    )

    $(".animate__animated").on("animationend", function () {
        $(this).removeClass("animate__animated animate__headShake")
    })
}) // end