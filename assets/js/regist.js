function csrfSafeMethod(method) {
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}
function sameOrigin(url) {
    var host = document.location.host; // host + port
    var protocol = document.location.protocol;
    var sr_origin = '//' + host;
    var origin = protocol + sr_origin;
    return (url == origin || url.slice(0, origin.length + 1) == origin + '/') ||
        (url == sr_origin || url.slice(0, sr_origin.length + 1) == sr_origin + '/') ||
        !(/^(\/\/|http:|https:).*/.test(url));
}
$.ajaxSetup({
    beforeSend: function (xhr, settings) {
        if (!csrfSafeMethod(settings.type) && sameOrigin(settings.url)) {
            let s = $.cookie("csrftoken")
            let csrftoken = $('input[name="csrfmiddlewaretoken"]').val();
            if (s) {
                csrftoken = s;
            }
            xhr.setRequestHeader("X-CSRFToken", csrftoken);
        }
    }
});
var password = ""
var psw_again = ""
var fn = ""
var ln = ""
var em = ""
var bi = ""
var gn = ""
var de = ""
var news = ""
var co = ""
// $("form input").change(function () {
//     $("form").removeClass("was-validated")
// })

$("#password").blur(function () {
    password = $(this).val()
})

$("#psw_again").blur(function () {
    psw_again = $(this).val()
})

$("#submit_btn").click(function () {
    $("form").addClass("was-validated")
    fn = $("#first_name").val()
    ln = $("#last_name").val()
    em = $("#email").val()
    if (!fn || !ln || !em || !em.match(/^(\w+)@(\w+.\w+)*.\w+$/) || password.length < 6) {
        return;
    }
    bi = $("#birthday").val()
    if (bi) {
        let dbi = new Date(bi)
        let d = new Date()
        if (dbi > d) {
            $("#birthday").addClass("is-invalid")
            return;
        }
    }
    gn = $("#gender").val()
    de = $("#devices").val()
    news = $("#news").val()
    $('#verify_modal').modal('show');
})
$(".animate__animated").on("animationend", function () {
    $(this).removeClass("animate__animated animate__headShake")
})

$(window).load(function () {
    // $('#verify_modal').modal('show');
})

var now_step = "psw"
$("#last_btn").click(reset_modal)
$("#psw_again").on("keypress", function (k) {
    if (k.keyCode == 13) {
        psw_again = $(this).val()
        next_click();
    }
})
$("#verify_code").on("keypress", function (k) {
    if (k.keyCode == 13) {
        verify_the_code();
    }
})
$("#next_btn").click(next_click)
function reset_modal() {
    $('#verify_modal').modal('hide')
    now_step = "psw"
    $("#dem_icon").removeClass('bi-envelope')
    $("#dem_icon").addClass('bi-exclamation-circle text-warning')
    $("#verify_code").addClass("d-none")
    $("#psw_again").removeClass("d-none")
    $("#dem_title").text('Verify your password')
    $("#dem_text").html('Please enter the password again')
    $("#dem_icon").removeClass('bi-envelope')
    $("#dem_icon").addClass('bi-exclamation-circle text-warning')
}
function next_click() {
    if (now_step == "psw") {
        if (psw_again != password) {
            $("#psw_again").val("");
            $("#psw_again").addClass("animate__animated animate__headShake")
            return;
        }
        // show code 
        $("#psw_again").val("");
        psw_again = ""
        $("#next_btn").attr('disabled', true)
        $("#psw_again").attr('disabled', true)
        $('#verify_modal .modal-content').removeClass('animate__animated animate__backInLeft')
            .addClass('animate__faster animate__animated animate__backOutLeft')
            .parent().on('animationend', function () {
                var self = $(this).children()
                $(this).off('animationend')
                self.removeClass('animate__animated animate__backOutLeft')
                $("#dem_title").text('Verifying your email...')
                self.addClass('animate__animated animate__backInRight')
            })
        request_mail_code();
        return;
    }
    else if (now_step == "code") {
        verify_the_code()
    }
}
var mail_title = ""
function send_mail_code_succ() {
    $("#psw_again").addClass("d-none")
    $("#verify_code").removeClass("d-none")
    $("#dem_title").text('verify your email')
    $("#dem_text").html(mail_title)
    $("#dem_icon").removeClass('bi-exclamation-circle text-warning')
    $("#dem_icon").addClass('bi-envelope')
    now_step = "code"
}
function request_mail_code() {
    $.post('/mails/code/', { email: em }, function (d, s) {
        $("#next_btn").attr('disabled', false)
        $("#psw_again").attr('disabled', false)
        if (s != "success") {
            return;
        }
        let c = d["code"]
        if (c >= 0) {
            mail_title = 'we have sent a email to:&nbsp;<u>' + em + "</u>,&nbsp;check it out"
            send_mail_code_succ();
            return;
        }
        if (c == -303) {
            alert("it seems you have already had a account, if you forgot your password please contact the staff");
            reset_modal()
            return;
        }
        else if (c == -34) {
            mail_title = 'we have already sent a email to:&nbsp;<u>' + em + "</u>,&nbsp;please check your mail"
            send_mail_code_succ()
            return;
        }
        alert("sorry we met a problem(" + c + ")");
        reset_modal()

    })
}
function verify_the_code() {
    co = $("#verify_code").val()
    if (co.length != 6) {
        $("#verify_code").val("")
        $("#verify_code").addClass("animate__animated animate__headShake")
        return;
    }
    let pack = { email: em, token: co }
    $.post('/mails/verify/', pack, function (d, status) {
        if (status != "success") {
            return;
        }
        if (d["code"] < 0) {
            $("#verify_code").val("")
            $("#verify_code").addClass("animate__animated animate__headShake")
            return;
        }
        finish_register();
    })

}
function finish_register() {
    let psd = em + password;
    psd = md5(psd)
    let pack = { email: em, token: co, news: news, first_name: fn, last_name: ln, birthday: bi, gender: gn, devices: de, password: psd }
    $.post('/account/regist/', pack, function (d, status) {
        if (status != "success") {
            return;
        }
        let c = d["code"]
        if (c >= 0) {
            // utoken uname
            $.cookie('username', em, { expires: 1, path: '/' })
            $.cookie('uname', d["uname"], { expires: 1, path: '/' })
            $.cookie('utoken', d["utoken"], { expires: 1, path: '/' })
            window.location.href = '/';
            return;
        }
        alert(d['msg'])
    })
}
