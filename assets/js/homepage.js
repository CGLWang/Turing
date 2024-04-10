$(function () {
    setInterval(switch_title, 10000)
})
var titles = [
    ['Hey! Who\'s it?', 'nice to meet you'],
    ['This is Canary', 'a MQTT pivot for better services'],
    ['All in One Account', 'please sign in first'],
    ['Newcomer', 'may you want to sign up']
]
var now_at = 0

function fade_in() {
    let s = titles[now_at]
    $('.all_footer h1').html(s[0])
    $('.all_footer p').text(s[1])
    $('.all_footer h1, .all_footer p').fadeIn(1000)
}

function switch_title() {
    now_at++;
    if (now_at >= titles.length)
        now_at = 0;
    $('.all_footer h1, .all_footer p').fadeOut(1000, fade_in)
}


function push_to_head(h, p) {
    titles.push([h, p])
    if (titles.length > 6) {
        titles.shift()
    }
}

function pop_from_head(h) {
    for (let i in titles) {
        let v = titles[i][0]
        if (v.startsWith(h)) {
            titles.splice(i, 1)
            return;
        }
    }
}


function after_login_generay() {
    $("#sign_in_out").off("click").click(function () {
        logout_account()
        after_logout()
    });
    $("#sign_in_out > ins").html("sign out")

}

function after_login() {
    after_login_generay()

    let name = $.cookie('uname');
    name = decodeURIComponent(name);
    if (name.length > 16) {
        name = name.substr(0, 16) + "...";
    }
    let s = "Hi " + name;
    // $("#hello_words").html(s)
    pop_from_head('Hey!')
    pop_from_head('Hi ')
    pop_from_head('All')
    pop_from_head('Newcomer')
    push_to_head(s, 'wellcome back')
}

function after_login_again_() {
    after_login_generay()
    let uid = $.cookie('uname');
    let s = "Hey " + decodeURIComponent(uid);
    // $("#hello_words").html(s)
    pop_from_head('Hey ')
    pop_from_head('Hey!')
    pop_from_head('All')
    pop_from_head('Newcomer')
    push_to_head(s, 'new to Canary? This won\'t last long')
    if (intention != undefined && intention != "") {
        window.location.href = intention;
        intention = "";
    }
}

function after_logout() {
    pop_from_head('Hey ')
    pop_from_head('Hi ')
    push_to_head('Hey! Who\'s it?', 'nice to meet you')
    push_to_head('All in One Account', 'please sign in first')

    $("#sign_in_out > ins").html("sign in")
    $("#sign_in_out").off("click").on("click", function () {
        intention = null
        $('#modal_login').modal('show')
    })
}

function home_page_loaded_done() {
    check_if_authed(function (yes) {
        if (yes != 'yes') return;
        $("#loader_div").addClass("animate__animated animate__fadeOut")
        $("#loader_div").on("animationend", function () {
            $("#loader_div").off('animationend')
            hide_loader();
            $("#home_view")[0].style.filter = "";
            after_login()
        })
    }, function (no) {
        if (no != 'no') return;
        // first hooks
        $("#sign_in_out").click(function () {
            $('#modal_login').modal('show')
        })

        $("#loader_div").addClass("animate__animated animate__fadeOut")
        $("#loader_div").on("animationend", function () {
            $("#loader_div").off('animationend')
            hide_loader();
            $('#modal_login').modal('show');
        })

        let u = $.cookie('username');
        if (u != undefined && u != "") {
            $("#user_id").val(u)
        }

    })

}

_login_modal_seted = home_page_loaded_done

$(window).load(function () {
    _login_intention = after_login_again_;
})
