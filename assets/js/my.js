function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}
function sameOrigin(url) {
    // test that a given url is a same-origin URL
    // url could be relative or scheme relative or absolute
    var host = document.location.host; // host + port
    var protocol = document.location.protocol;
    var sr_origin = '//' + host;
    var origin = protocol + sr_origin;
    // Allow absolute or scheme relative URLs to same origin
    return (url == origin || url.slice(0, origin.length + 1) == origin + '/') ||
        (url == sr_origin || url.slice(0, sr_origin.length + 1) == sr_origin + '/') ||
        // or any other URL that isn't scheme relative or absolute i.e relative.
        !(/^(\/\/|http:|https:).*/.test(url));
}
$.ajaxSetup({
    beforeSend: function (xhr, settings) {
        if (!csrfSafeMethod(settings.type) && sameOrigin(settings.url)) {
            // Send the token to same-origin, relative URLs only.
            // Send the token only if the method warrants CSRF protection
            // Using the CSRFToken value acquired earlier
            let s = $.cookie("csrftoken")
            let csrftoken = $('input[name="csrfmiddlewaretoken"]').val();
            if (s) {
                csrftoken = s;
            }
            xhr.setRequestHeader("X-CSRFToken", csrftoken);
        }
    }
});
var in_mobile = (/(iPhone|iPad|iPod|iOS|Android|SymbianOS|Windows Phone|webOS|BlackBerry)/i).test(navigator.userAgent);
if (!in_mobile)
    $('.nice_over').niceScroll();
else
    $('.nice_over').addClass('overflow-auto')
var on_editing = false

const pull_dev_url = '/polls/devlist/'
const pull_dev_detail_url = '/polls/detail/'
const alert_dev_url = '/polls/alert/'
const new_eye_url = '/polls/eye/'
const rm_eye_url = '/polls/rmeye/'
const alert_con_url = '/polls/alerteye/'
const rm_dev_url = '/polls/rmdev/'
const add_dev_url = '/polls/newdev/'
const alter_account_url = '/account/update/'
const reset_psw_url = '/account/reset/'

var new_created_condition = 0
var editors = {}

function start_edit() {
    on_editing = true
    $(".e").attr('contenteditable', 'true')
    // $("textarea").attr('readonly', null)
    edit_editors()
    $(".condition-pack span").attr('contenteditable', 'true').addClass('text_in_edit')
    $(".e").addClass('text_in_edit')
    $("#new_condition_btn").removeClass('d-none')
    $(".condition-pack-out").addClass('border g25')
    $('.condition-pack-close').removeClass('d-none')
    $("#edit_btn").text("Save")
    $('#reset_btn').text('Cancel')
    $("#edit_btn").off('click')
    $("#edit_btn").click(save_edition)
    $("#reset_btn").click(cancel_edition)

    $('#reset_psw_a').fadeOut('normal')
    // $(".nice_over").getNiceScroll(0).resize()
    // $("#main_content").getNiceScroll(0).resize()
    resize_bar()
}
function cancel_edition() {
    if (current_handle.attr('id') == 'account_tab') {
        show_account()
        end_edition()
        return;
    }

    show_profile(current_info)
    let cns = $('.condition-pack-out')
    if (cns.length > 0) {
        cns.each(reset_this_condition)
    }
    end_edition()
}

function resize_bar() {
    if (!in_mobile)
        $(".nice_over").each(function () {
            $(this).getNiceScroll(0).resize()
        })
}
function end_edition() {
    $(".e").attr('contenteditable', 'false')
    // $("textarea").attr('readonly', 'true')
    lock_editors()
    $(".e").removeClass('text_in_edit')
    $(".condition-pack span").attr('contenteditable', 'false').removeClass('text_in_edit')
    $(".condition-pack-out").removeClass('border g25')
    $('.condition-pack-close').addClass('d-none')
    $("#new_condition_btn").addClass('d-none')

    $("#edit_btn").text("Edit")
    $('#reset_btn').text('')
    $("#edit_btn").off('click')
    $('#reset_btn').off('click')
    $("#edit_btn").click(start_edit)
    $('#reset_psw_a').fadeIn('normal')
    resize_bar()
    on_editing = false
}
function save_edition() {
    check_info()
    end_edition()
}
$("#edit_btn").click(start_edit)
function display_hint(msg) {
    $("#hint").text(msg)
}
function filter_dev(k = null) {
    if (k == null) {
        k = $('#search_input').val()
    }
    if (!k.toLocaleLowerCase) return;
    k = k.toLocaleLowerCase()
    if (!k || k == "") {
        let cc = $("#dev_list ").children()
        cc.removeClass('d-none')
        $("#dev_count").text(cc.length + " device(s)")
        return;
    }

    display_hint(k)
    let n = 0
    $("#dev_list ").children().each(function () {
        let v = $(this).text()
        if (v.includes(k)) {
            $(this).removeClass('d-none')
            n++
        }
        else {
            $(this).addClass('d-none')
        }
    })
    $("#dev_count").text(n + " device(s)")
}
$('#search_input').change(filter_dev)
$('#search_input').keypress(function (e) {
    if (e.keyCode == 13) {
        filter_dev()
        return;
    }
    let s = $(this).val() + e.key
    filter_dev(s)
})

$(window).load(function () {
    // $("#rm_dev_modal").modal('show')
    // show_this('abc')
    account_info['fullname'] = $('#account_nick').text()
    account_info['email'] = $('#account_id_span').text()
    account_info['firstname'] = $('#account_firstname_span').text()
    account_info['lastname'] = $('#account_lastname_span').text()

    pull_device()
})

function in_account_tab() {
    if (!current_handle)
        return true;
    if (current_handle.attr('id') == 'account_tab') {
        return true;
    }
    return false
}

// name,nick,desc,id,tags,alive
function show_profile(dict) {
    $('#dev_nick').text(dict['nick'])
    $("#name_img").text(dict['nick'])
    $('#dev_desc').text(dict['desc'])
    $("#top_dev").text(dict['name'])
    $("#dev_id_span").text(dict['id'])
    $("#dev_tags_span").text(dict['tags'])
    $("#dev_alive_span").text(dict['alive'])
}

function show_account() {
    $('#account_nick').text(account_info['fullname'])
    // $('#account_id_span').text(account_info['email'])
    $('#account_firstname_span').text(account_info['firstname'])
    $('#account_lastname_span').text(account_info['lastname'])
    $('#account_name_img').text(account_info['lastname'])
}

function show_condition(handle, pack) {
    handle.find(".condition-pack span, textarea").each(function () {
        let s = $(this).parent().prev().children('b').text()
        let v = pack[s];
        if (!$(this).hasClass('e'))
            $(this).text(v)
        else
            $(this).val(v)
    })
    handle.find(".editor").each(function () {
        let s = $(this).parent().prev().children('b').text()
        let v = pack[s];
        let id = $(this).attr('id')
        let editor = editors[id]
        editor.setValue(v)
    })
}
// cid,Condition,Action,Count,Alert period,Type
function append_a_condition(condiction) {
    let cid = condiction['cid']
    let id1 = 'id1_' + cid
    let id2 = 'id2_' + cid
    let c2 = condition_pack.replace('%id1%', id1).replace('%id2%', id2)
    // c2 = c2.replace('%id2%', id2)
    let el = $(c2)
    // $("#viewportdiv").niceScroll("#wrapperdiv",{cursorcolor:"#00F"}); 

    el.attr('data-ids', cid)
    // filling data
    el.find(".condition-pack span, textarea").each(function () {
        let s = $(this).parent().prev().children('b').text()
        let v = condiction[s];
        if (!$(this).hasClass('e'))
            $(this).text(v)
        else
            $(this).val(v)
    })
    el.children('.condition-pack-close').click(function () {
        delete_a_condition(el)
    })
    $("#new_condition_btn").before(el)
    var editor1 = initEditor(id1, true, condiction['Condition'])
    var editor12 = initEditor(id2, false, condiction['Action'])
    editors[id1] = editor1
    editors[id2] = editor12

    // let ts = el.find('.nice_over').niceScroll()

    // resize_bar()
    return el;
}
function initEditor(cid, no_line, filling_data) {
    var editor = ace.edit(cid);
    editor.setTheme("ace/theme/xcode");
    editor.setFontSize(18);
    editor.setHighlightActiveLine(false);
    var PythonMode = ace.require("ace/mode/python").Mode;
    editor.session.setMode(new PythonMode());
    // editor.getSession().setUseWrapMode(true);
    ace.require("ace/ext/language_tools");
    editor.setOptions({
        enableLiveAutocompletion: true,
        enableBasicAutocompletion: true,
        // enableSnippets: true
    });
    // editor.session.setUseWorker(true);
    // editor.setShowPrintMargin(false);
    editor.renderer.setShowGutter(!no_line);
    editor.setValue(filling_data);
    editor.moveCursorTo(0, 0);
    editor.setReadOnly(true);
    return editor
}
function release_editors() {
    for (i in editors) {
        let editor = editors[i]
        editor.destroy();
        editor.container.remove();
    }
    editors = {}
}
function edit_editors() {
    for (i in editors) {
        let editor = editors[i]
        editor.setReadOnly(false);
    }
}
function lock_editors() {
    for (i in editors) {
        let editor = editors[i]
        editor.setReadOnly(true);
        editor.moveCursorTo(0, 0);
    }
}

// name,nick,desc,id,tags,alive
// con_dic[data-ids] -> id,Condition,Action,Count,Alert period,Type
var current_info = {}
var account_info = {}
var current_handle = null
// OK
function upload_profile_changes(pack) {
    // pack: 'nick', 'desc', 'tags', 'alive'
    pack['device'] = current_info['name']
    $.post(alert_dev_url, pack, function (d, s) {
        if (s != 'success' || d['ok'] < 0) {
            //TODO: change the display
            display_hint('sorry, we met a problem')
            show_profile(current_info)
            return;
        }
        for (let i in pack) {
            current_info[i] = pack[i]
        }
        $("#name_img").text(current_info['nick'])
    })
}

// OK
function upload_condition_changes(pack, handle) {
    // pack: cid,Condition,Action,Count,Alert period,Type
    pack['device'] = current_info['name']
    $.post(alert_con_url, pack, function (d, s) {
        if (s != 'success' || d['ok'] < 0) {
            //change the display
            display_hint('sorry, we met a problem')
            let cid = pack['cid']
            for (let i in pack) {
                if (i == 'cid') continue;
                pack[i] = current_info[cid][i]
            }
            show_condition(handle, pack)
            return;
        }
        let old_info = current_info[pack['cid']]
        for (let i in pack) {
            old_info[i] = pack[i]
        }
    })
}

// OK
function upload_new_condition(pack, handle) {
    // pack: Condition,Action,Count,Alert period,Type
    pack['device'] = current_info['name']
    $.post(new_eye_url, pack, function (d, s) {
        if (s != 'success' || d['ok'] < 0) {
            display_hint('sorry, we met a problem')
            handle.remove()
            return;
        }
        let given_cid = d['cid']
        pack['cid'] = given_cid
        pack['handle'] = handle
        current_info[given_cid] = pack
        handle.attr('data-ids', given_cid)
    })
}
// OK
function delete_a_condition(handle) {
    let cid = handle.attr('data-ids')
    if (cid < 0) {

        handle.addClass('animate__animated animate__backOutRight')
        handle.on('animationend', function () {
            handle.remove()
            resize_bar()
            // $("#main_content").getNiceScroll(0).resize()
        })
        return;
    }
    $.post(rm_eye_url, { device: current_info['name'], cid: cid }, function (d, s) {
        if (s != 'success' || d['ok'] < 0) {
            display_hint('we met a problem while trying to remove a condition')
            return;
        }
        handle.addClass('animate__animated animate__backOutRight')
        handle.on('animationend', function () {
            handle.remove()
            delete current_info.cid;
            // $("#main_content").getNiceScroll(0).resize()
            resize_bar()
        })
    })
}

function check_info() {
    // account
    var pack = {}
    if (in_account_tab()) {
        if (account_info['firstname'] != $('#account_firstname_span').text()) {
            pack['firstname'] = $('#account_firstname_span').text()
        }
        if (account_info['lastname'] != $('#account_lastname_span').text()) {
            pack['lastname'] = $('#account_lastname_span').text()
        }
        if (pack.length == 0) return;
        // Post
        $.post(alter_account_url, pack, function (d, s) {
            if (s != 'success' || d['ok'] < 0) {
                display_hint('sorry, we met a problem')
                show_account()
                return;
            }
            account_info['firstname'] = pack['firstname']
            account_info['lastname'] = pack['lastname']
            account_info['fullname'] = account_info['firstname'] + ' ' + account_info['lastname']
            show_account()

        }).fail(function (out) {
            display_hint('sorry, we met a problem -2')
            show_account()
        })
        // update
        return;
    }

    // profile
    let fs = ['nick', 'desc', 'tags', 'alive']
    let hs = ['#dev_nick', '#dev_desc', '#dev_tags_span', '#dev_alive_span']
    for (let i in fs) {
        let f = fs[i]
        let val = $(hs[i]).text()
        if (current_info[f] != val && (current_info[f] || val)) {
            pack[f] = val
        }
    }
    if (Object.keys(pack).length > 0) {
        upload_profile_changes(pack)
    }
    // check conditions
    let cns = $('.condition-pack-out')
    if (cns.length < 1)
        return;
    cns.each(check_this_condition)
}

function check_this_condition() {
    // call in each(), for every condition-pack-out 
    let self = $(this)
    let id_no = self.attr('data-ids')
    let pack = {}
    if (id_no < 0) { // new created condition, upload it
        self.find(".editor").each(function () {
            let f = $(this).parent().prev().children('b').text()
            var id = $(this).attr('id')
            var editor = editors[id]
            let v = editor.getValue()
            // if (v)
            pack[f] = v;
        })

        self.find(".condition-pack span, textarea").each(function () {
            let f = $(this).parent().prev().children('b').text()
            let v;
            if (!$(this).hasClass('e'))
                v = $(this).text()
            else
                v = $(this).val()
            pack[f] = v;
        })
        upload_new_condition(pack, self)
        return;
    }

    let info = current_info[id_no]
    self.find(".editor").each(function () {
        let f = $(this).parent().prev().children('b').text()
        var id = $(this).attr('id')
        var editor = editors[id]
        let v = editor.getValue()

        if (v != info[f] && (v || info[f])) {
            pack[f] = v;
        }
    })

    self.find(".condition-pack span, textarea").each(function () {
        let f = $(this).parent().prev().children('b').text()
        let v;
        if (!$(this).hasClass('e'))
            v = $(this).text()
        else
            v = $(this).val()
        if (v != info[f] && (v || info[f])) {
            pack[f] = v;
        }
    })
    if (Object.keys(pack).length > 0)// something changed
    {
        pack['cid'] = id_no // condition id
        upload_condition_changes(pack, self);
    }
}

function reset_this_condition() {
    let self = $(this)
    let id_no = self.attr('data-ids')
    if (id_no < 0) { // new created condition, upload it
        self.remove()
        return;
    }
    let pack = current_info[id_no]
    show_condition(self, pack)
}

function show_this(name) {
    // clear first
    release_editors()
    // $('.nicescroll-rails').remove()
    $(".e").empty()
    $(".condition-pack-out").remove()
    $("#top_dev").text(name)
    $('#name_img').empty()
    let spinner = new Spinner({ lines: 10, color: 'white' });
    var target = $("#name_img").parent()[0]
    spinner.spin(target);
    $('.condition_pack_out').remove() // clear main content
    current_info = {}
    $.post(pull_dev_detail_url, { device: name }, function (d, s) {
        spinner.spin()
        if (s != 'success' || d['ok'] < 0) {
            display_hint('sorry, we met a problem')
            return;
        }
        d['name'] = name
        current_info = d
        show_profile(d)
        if (d['conditions'].length > 0) {
            let cns = d['conditions']
            for (let i in cns) {
                let c = cns[i]
                // id,Condition,Action,Count,Alert period,Type
                let cond = { cid: c[0], Condition: c[1], Action: c[2], Count: c[3], 'Alert period': c[4], Type: c[5] }
                let handle = append_a_condition(cond)
                cond['handle'] = handle
                current_info[c[0]] = cond
            }
        }
        // $(".nice_over").getNiceScroll().resize()
        resize_bar()
    })
}

function dev_tbs_click() {
    if (on_editing)
        return;
    if (current_handle.attr('id') == 'account_tab') {
        $('#account_content').addClass('d-none')
        $('#main_content').removeClass('d-none')
    }
    let s = $(this).text()
    const p = /[^:]:(\w+)/
    let select_dev = s;
    if (p.test(s)) {
        select_dev = RegExp.$1
    }
    if (select_dev != current_info['name']) {
        show_this(select_dev)
        current_handle.removeClass('bg-light')
        current_handle = $(this)
        current_handle.addClass('bg-light')
    }
}

$('#account_tab').click(function () {
    if (on_editing)
        return;
    if (current_handle.attr('id') == 'account_tab') {
        return;
    }

    $('#main_content').addClass('d-none')
    $('#account_content').removeClass('d-none')

    $("#top_dev").text($('#account_tab > b').text() + "'s Account")
    show_account()
    current_info = {}
    current_handle.removeClass('bg-light')
    current_handle = $(this)
    current_handle.addClass('bg-light')

})


function pull_device() {
    $.post(pull_dev_url, { all: false }, function (d, s) {
        if (s != 'success') {
            display_hint('bad:' + s)
            return;
        }
        if (d['ok'] < 0) {
            display_hint(d['msg'])
        }
        $('#dev_list > .p-2').remove()
        current_info = {}
        current_handle = null
        let ds = d['device']
        for (let i in ds) {
            let name = ds[i][0]
            let nick = ds[i][1]
            let ss = ''
            if (nick)
                ss = nick + ' :'
            ss += name
            let el = '<div class="p-2 border-bottom">' + ss + '</div>'
            $('#dev_list').append($(el))
        }
        n = ds.length
        $("#dev_count").text(n + " device(s)")
        // $(".nice_over").getNiceScroll().resize()
        resize_bar()
        $('#dev_list > .p-2').click(dev_tbs_click)

        current_handle = $('#account_tab')
        $("#top_dev").text($('#account_tab > b').text() + "'s Account")
        // if (n > 0) {
        //     show_this(ds[0][0])
        //     current_handle = $('#dev_list > .p-2:first')
        //     current_handle.addClass('bg-light')
        // }
    })
}



$("#new_condition_btn").click(create_a_new_condition)

function create_a_new_condition() {
    new_created_condition -= 1
    append_a_condition({ cid: new_created_condition, Condition: 'True', Action: 'alert(me,"title","the email content")', Count: 3, 'Alert period': 60, Type: 'once' })
    start_edit()

    let el = $("#main_content")
    let h = el.prop('scrollHeight')
    el.scrollTop(h);
    // $("#main_content").getNiceScroll(0).doScrollTop($("#main_content").prop('scrollHeight'), 100);

}


$('#del_dev_btn').click(function () {
    if (in_account_tab())
        return;
    $("#rm_dev_modal").modal('show')
})
$("#modal_rm_btn").click(function () {
    let self = $(this)
    self.attr('disabled', 'true')
    $.post(rm_dev_url, { device: current_info['name'] }, function (d, s) {
        if (s != 'success' || d['ok'] < 0) {
            let sc = 'failed to remove device, please try again later'
            display_hint(sc)
            $("#rm_dev_modal .modal-body").text(sc)
            setTimeout(function () {
                $("#rm_dev_modal .modal-body").html('Are your sure you want to delete this device?<br>You can readd the device if you have the Device ID.')
                $("#modal_rm_btn").attr('disabled', null)
            }, 3000)
        }
        $("#rm_dev_modal").modal('hide')
        pull_device()
        self.attr('disabled', null)
    })
})

$('#add_dev_btn').click(function () {
    $("#dev_ids").val('')
    $("#new_dev_modal .row span").text('please enter your device ID, if you have more than one device, seprate them with comma')
    $("#modal_add_btn").attr('disabled', null)
    $("#new_dev_modal").modal('show')
})

$("#modal_add_btn").click(function () {
    let s = $("#dev_ids").val()
    if (!s)
        return;
    s = s.replace(/\s/, '')
    $(this).attr('disabled', 'true')
    $.post(add_dev_url, { dev_ids: s }, function (d, s) {
        if (s != 'success' || d['ok'] < 0) {
            let sc = 'failed to add new devices, please try again later'
            display_hint(sc)
            $("#new_dev_modal .row span").text(sc)
            setTimeout(function () {
                $("#new_dev_modal .row span").text('please enter your device ID, if you have more than one device, seprate them with comma')
                $("#modal_add_btn").attr('disabled', null)
            }, 3000)
            return;
        }
        $("#new_dev_modal .row span").text('Success! Your Device will be displayed after they\'s registed to system')
        setTimeout(function () {
            $("#new_dev_modal").modal('hide')
        }, 2000)
    })
})

$(".animate__animated").on("animationend", function () {
    $(this).val('')
    $(this).removeClass("animate__animated animate__headShake")
})

function alert_msg(msg, warning = true) {
    if (!warning) {
        $('#alert_block').removeClass('alert-warning').addClass('alert-success')
    }
    else {
        $('#alert_block').removeClass('alert-success').addClass('alert-warning')
    }
    var p = $('#alert_block')
    var c = $('#alert_block > div')
    if (p.hasClass('collapse')) {
        c.text(msg)
        p.collapse('show')
        setTimeout(() => {
            p.collapse('hide')
        }, 7000);
    }
    else {
        c.text(msg)
    }
}
$('#reset_psw_modal').on('hidden.bs.modal', function () {
    $('#reset_psw_modal input').val('')
})
$('#reset_psw_modal input').on('change', function () {
    var v = $(this).val()
    if (!v)
        return;
    if ($(this).hasClass('border-danger')) {
        $(this).removeClass('border-danger').addClass('border-light')
    }
})
$('#modal_reset_psw').click(function () {
    // check
    let a = document.getElementById('password_original').value
    let b = document.getElementById('password_new').value
    let c = document.getElementById('password_again').value
    if (!a || !b || !c) {
        alert_msg('please finished the process')
        return;
    }
    if (b != c) {
        alert_msg('new passwords check failed')
        $('#password_again').toggleClass('border-light border-danger animate__animated animate__headShake')
        return;
    }

    if (b == a) {
        alert_msg('new passwords is exactly the original one')
        $('#password_new').toggleClass('border-light border-danger animate__animated animate__headShake')
        return;
    }
    if (b.length < 8) {
        alert_msg('weak password, please make sure your new password consist of at lest 8 characteristics')
        $('#password_new').toggleClass('border-light border-danger animate__animated animate__headShake')
        return;
    }
    var self = $(this)
    self.attr('disabled', true)
    // post
    let us = account_info['email']
    let pwd = md5(us + a);
    let sid = $.cookie('csrftoken')
    let hexHash = md5(pwd + sid);
    let new_psw = md5(us + b)
    let pack = { password: hexHash, new_password: new_psw }
    $.post(reset_psw_url, pack, function (d, s) {
        self.attr('disabled', null)
        if (s != 'success' || d['ok'] < 0) {
            alert_msg('password maybe incorrect')
            $('#password_original').addClass('border-danger animate__animated animate__headShake')
            return;
        }
        alert_msg('reset Successfully. The original password is invalid.', false)
        setTimeout(() => {
            $('#reset_psw_modal').modal('hide')
        }, 2000);
    }).fail(function (out) {
        self.attr('disabled', null)

        alert_msg('sorry we met a problem')
    })
    // hide
})

var url_logout = "/account/logout/"
// var url_auth = "/account/auth/"

function logout_this_account() {
    let token = $.cookie('utoken')
    if (!token) {
        display_hint("got a problem(-226)")
        return;
    }
    $.get(url_logout, function (data, status) {
        if (status != "success") {
            display_hint('some thing went wrong(' + status + ")")
        } else if (data == "ok") {
            $.removeCookie('username')
            $.removeCookie('uname')
            $.removeCookie('utoken')
            // redirect 
            window.location.href = '/';
            return;
        }
        display_hint('some thing went wrong(-240)')
    })
}

$("#out_btn").click(logout_this_account);


const condition_pack = `<div class="ms-5 me-5 my-4 r-15 condition-pack-out">  
<span class="d-none ms-1 btn translate-middle bg-danger badge condition-pack-close">  
    <i class="bi bi-dash-lg"></i>  
</span>  
<div class="condition-pack row  py-2 px-2 ">  
    <div class="col-sm-12 col-md-12 col-lg-4 col-xl-4  text-sm-start text-md-start text-lg-end text-xl-end">  
        <b class="bd text-muted pt-1">Condition</b>  
    </div>  
    <div class="col-sm-12 col-md-12 col-lg-8 col-xl-8">  
        <div id="%id1%" class="editor editor1 r-10 w-100 g2"></div>  
    </div>  
    <div class="col-sm-12 col-md-12 col-lg-4 col-xl-4  text-sm-start text-md-start text-lg-end text-xl-end mt-2 ">  
        <b class="bd text-muted pt-1">Action</b>  
    </div>  
    <div class="col-sm-12 col-md-12 col-lg-8 col-xl-8  mt-2">  
    <div id="%id2%" class="editor editor2 r-15 w-100 g2"></div>
    </div>  
    <div class="col-4  text-end mt-2 ">  
        <b class="bd text-muted pt-1">Count</b>  
    </div>  
    <div class="col-8  mt-2">  
        <span class="">1</span>  
    </div>  
    <div class="col-4  text-end mt-2 ">  
        <b class="bd text-muted pt-1">Alert period</b>  
    </div>  
    <div class="col-8  mt-2">  
        <span class="">1hour</span>  
    </div>  
    <div class="col-4  text-end mt-2 ">  
        <b class="bd text-muted pt-1">Type</b>  
    </div>  
    <div class="col-8  mt-2">  
        <span class="">always</span>  
    </div>  
</div>  
</div>`


function go_my_account() {
    // http://127.0.0.1:8000/pulls/my/eglwangAT163.com/
    var url = '/pulls/my/'
    window.location.href = url
}
$('.bi-gear-wide-connected').parent().next().children().eq(0).click(go_my_account)
$('.modal-dialog-centered').parent().on('show.bs.modal', function () {
    $(this).find('.modal-content').addClass('animate__faster animate__animated animate__zoomIn')
})

$("#sidebar_togger").click(function () {
    if ($("#list").hasClass('d-none')) {
        var main_body = $('#main_body')
        $("#list").removeClass('d-none').css('position', 'absolute')
            .height(main_body.height())
            .addClass('shadow-lg animate__faster animate__animated animate__fadeInLeft')
        $('#main_body').click(function () {
            $("#list").addClass('d-none')
            $(this).off('click')
        })
    }
    else {
        $("#list").addClass('d-none')
    }
})