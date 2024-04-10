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
$('#upload_files').on('change', easyUpload)
function easyUpload() {
    var file = $('#upload_files').prop('files')
    var form = new FormData();
    for (let i of file) {
        form.append('files', i)
    }
    var xhr = new XMLHttpRequest();
    let s1 = window.location.href
    let p = RegExp('.+/pulls/my/(.*$)')
    var action = "/pulls/upload/";
    if (p.test(s1)) {
        action += RegExp.$1;
    }
    xhr.open("POST", action);
    let s = $.cookie("csrftoken")
    let csrftoken = $('input[name="csrfmiddlewaretoken"]').val();
    if (s) {
        csrftoken = s;
    }
    xhr.setRequestHeader("X-CSRFToken", csrftoken);
    console.info('send')

    xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) { //xhr.readyState == 4 && 
            if (xhr.status != 200) {
                show_error('fail to upload fail')
            }
            var resultObj = JSON.parse(xhr.responseText);
            // console.log(resultObj)
            if (resultObj.ok < 0) {
                show_error('error ' + resultObj.ok + ":" + resultObj.msg)
                return;
            }
            update_all()
            let number = resultObj.number
            show_info("successfully upload " + number + " files")
        }
        else {
            console.log(xhr.readyState)

        }
    }
    xhr.send(form); //发送表单数据

    $('#upload_files').val('')
    // }
}
function easyRemove() {

    let s1 = window.location.href
    let p = RegExp('.+/pulls/my/(.*$)')
    var action = "/pulls/remove/";
    if (p.test(s1)) {
        action += RegExp.$1;
    }
    let els = $('#main_block .col[data-sel=true]')
    let url_lists = []
    for (let i = 0; i < els.length; i++) {
        let el = els.eq(i)
        url_lists.push(el.children('.badge').attr('title'))
    }
    // $('#main_block .col[data-sel=true]').attr('data-sel', null)
    toggle_select()
    if (url_lists.length == 0)
        return;
    let pack = { 'files': url_lists }
    $.post(action, pack, function (d, s) {
        if (s != 'success' || d['ok' < 0]) {
            let s = 'error：' + d['ok'] + ':' + d['msg']
            console.log(s)
            show_error(s)
            d['number'] = 0
        }
        s = 'delete ' + d['number'] + ' items'
        show_error(s)
        update_all()
    }).fail(function () {
        show_error('fail to post')
    })
}

$('#remove_file').toggle()
$('#remove_file').click(easyRemove)
$('#new_file').click(function () {
    // easyUpload()
    $('#upload_files').click()
})
var _statues_selected = false;

function toggle_select() {
    _statues_selected = !_statues_selected;
    $('#select_file').toggleClass('text-primary')
    $('#remove_file').toggle('normal')
    $('#new_folder').toggle('normal')
    if (_file_rename_src_el)
        _file_rename_src_el.removeClass('g25')
    if (_in_warning != null) {
        clearTimeout(_in_warning)
        _in_warning = null
    }
    if (_statues_selected) {

        $('#main_block a').click(function (e) {
            e.preventDefault()
            e.stopPropagation()
            let p = $(this).parent('.col')
            if (!p.attr('data-sel'))
                p.attr('data-sel', 'true')
            else
                p.attr('data-sel', null)
            $(this).siblings('.badge').toggleClass('bg-primary text-dark text-light')
        })
        // $('#main_block a').off('click')
        $('#main_block .badge').off('click') // default rename click handle

        $('#main_block .badge').click(function (e) {
            e.preventDefault()
            e.stopPropagation()
            let p = $(this).parent('.col')
            if (!p.attr('data-sel'))
                p.attr('data-sel', 'true')
            else
                p.attr('data-sel', null)
            $(this).toggleClass('bg-primary text-dark text-light')
        })
        $('footer').css('background-color', 'rgba(37, 255, 255, 0.8)')

    }
    else {
        let els = $('#main_block > .col[data-sel=true]')
        for (let i = 0; i < els.length; i++) {
            let el = els.eq(i)
            el.children('.badge').removeClass('bg-primary text-light').addClass('text-dark')
        }
        $('#main_block > .col[data-sel=true]').attr('data-sel', null)
        $('#main_block a').off('click')
        $('#main_block .badge').off('click')
        $('#main_block .badge').click(file_name_clicked)
        $('footer').css('background-color', 'rgba(255, 255, 255, 0.8)')

    }
}
$('#select_file').click(toggle_select)
const _file_types = 'code,excel,music,pdf,ppt,font,image,zip,word'.split(',')
const __file_exts = 'h|hpp|c|cpp|cs|java|js|css|html|py|php,xlsx?,mp3|wav,pdf,ppt(x)?,txt,jpg|jpeg|png|bmp|gif|svg,zip|rar|tar,docx?'.split(',')
if (_file_types.length != __file_exts.length) {
    console.log('exts are wrong')
}

var _file_exts = []
for (let i in __file_exts) {
    _file_exts.push(new RegExp('^(' + __file_exts[i] + ')$'))
}

function determine_type(name) {
    if (!name) {
        return 'bi-file-earmark-fill'
    }
    for (let i in _file_exts) {
        let re = _file_exts[i]
        if (re.test(name)) {
            return 'bi-file-earmark-' + _file_types[i] + '-fill'
        }
    }
    return 'bi-file-earmark-fill'
}

function rename_a_file(src, dst) {
    if (src == dst) return;
    _file_rename_src_el.text(dst)
    _file_rename_src_el.attr('title', dst)
    var action = "/pulls/rename/";
    let s1 = window.location.href
    let p = RegExp('.+/pulls/my/(.*$)')
    if (p.test(s1)) {
        action += RegExp.$1;
    }
    $.post(action, { src: src, dst: dst }, function (d, s) {
        if (s != 'success' || d['ok'] < 0) {
            let s = 'error：' + d['ok'] + ':' + d['msg']
            console.log(s)
            show_error(s)
            _file_rename_src_el.text(src)
            _file_rename_src_el.attr('title', src)
            return;
        }
    }).error(function (param) {
        _file_rename_src_el.text(src)
        _file_rename_src_el.attr('title', src)
        show_error('failed renaming')
    })
}
var _file_rename_src = null
var _file_rename_src_el = null
function setInputSelection(input_id, startPos, endPos) {
    var input = document.getElementById(input_id);
    input.focus();
    if (typeof input.selectionStart != "undefined") {
        input.selectionStart = startPos;
        input.selectionEnd = endPos;
    } else if (document.selection && document.selection.createRange) {
        // IE branch
        input.select();
        var range = document.selection.createRange();
        range.collapse(true);
        range.moveEnd("character", endPos);
        range.moveStart("character", startPos);
        range.select();
    }
}
function file_name_clicked() {
    var self = $(this)
    if (_file_rename_src_el)
        _file_rename_src_el.removeClass('g25')
    self.addClass('g25')

    var last_click = self.attr('data-last-click')
    if (!last_click) {
        last_click = (new Date()).getTime()
        self.attr('data-last-click', last_click)
        _file_rename_src_el = self
        return;
    }
    var now = (new Date()).getTime()

    var href = self.siblings('a').attr('href')
    if (now - last_click < 200) // open
    {
        window.location.href = href
        _file_rename_src_el = self
        self.attr('data-last-click', now)
        return;
    }
    if (now - last_click < 2000) // rename
    {
        _file_rename_src_el = self
        var f = self.attr('title')
        _file_rename_src = f

        $('#rename_file_dst').val(f)

        $('#modal_rename_file p').html(`Rename file <span class="text-primary text-truncate">${f}</span>`)
        $('#modal_rename_file').modal('show')

        self.attr('data-last-click', null)
        return;
    }
    self.attr('data-last-click', now)
    _file_rename_src_el = self
}
function event_rename_a_file() {
    var dst = $('#rename_file_dst').val()
    if (!dst) return;
    rename_a_file(_file_rename_src, dst)
    $('#modal_rename_file').modal('hide')
}
$('#rename_file_btn').click(event_rename_a_file)

$("#rename_file_dst").on('keypress', function (e) {
    if (e.keyCode == 13) {
        if ($('#rename_file_dst').val())
            event_rename_a_file()
    }
})

$('#modal_rename_file').on('shown.bs.modal', function () {
    var f = $('#rename_file_dst').val()
    var dot = f.lastIndexOf('.')
    if (dot < 0) {
        dot = f.length
    }
    setInputSelection('rename_file_dst', 0, dot)
})


function update_all() {
    let url = window.location.href
    $.post(url, {}, function (d, s) {
        if (s != 'success' || d['ok'] < 0) {
            let s = 'error：' + d['ok'] + ':' + d['msg']
            console.log(s)
            show_error(s)
            return;
        }
        let main = $('#main_block')
        main.empty()
        let dires = d.dires
        let links = d.links

        let now_dir = d.now_dir.replace('@', 'AT')
        let p = RegExp('(.+/pulls/my/)(.*$)')
        let current_url = window.location.href
        if (!current_url.endsWith('/'))
            current_url += '/'
        for (let i in dires) {
            let dir_p = dires[i]
            let dir = dir_p // decodeURI(dir_p)
            let dir_truncated = dir.substr(0, 12);
            let se = `
            <div class="text-truncate col text-decoration-none d-flex flex-column align-items-center my-2">
                <a href="${current_url + dir_p}/"><i class="bi bi-folder-fill display-6" data-bs-toggle="tooltip" title=" ${dir}"></i></a>
                <div class="text-dark badge mt-2 rounded-3" data-bs-toggle="tooltip" title="${dir}">${dir_truncated}</div>
            </div>`
            let el = $(se)
            main.append(el)
        }
        for (let i in links) {
            let dir_p = links[i]
            let dir = dir_p // decodeURI(dir_p)
            let dir_truncated = dir.substr(0, 12);
            let se = `
            <div class="text-truncate col text-decoration-none d-flex flex-column align-items-center my-2">
                <a href="${current_url + dir_p}/"><i class="bi bi-folder-symlink-fill display-6 " data-bs-toggle="tooltip" title="${dir}"></i></a>
                <div class="text-dark badge mt-2 rounded-3" data-bs-toggle="tooltip" title="${dir}">${dir_truncated}</div>
            </div>`
            let el = $(se)
            main.append(el)
        }

        let files = d.files
        for (let i in files) {
            let file_p = files[i]
            let file = file_p //decodeURI(file_p)
            let _at = file.lastIndexOf('.')
            let file_extention = ''
            if (_at >= 0) {
                file_extention = file.substr(_at + 1)
            }
            let bi = determine_type(file_extention)
            let file_truncated = file.substr(0, 12)
            let se = `
                <div class="text-truncate col text-decoration-none d-flex flex-column align-items-center my-2">
                    <a href="${current_url + file_p}"><i class="bi ${bi} display-6" data-bs-toggle="tooltip" title="${file}"></i></a>
                    <div class="text-dark badge mt-2 rounded-3" data-bs-toggle="tooltip" title="${file}">${file_truncated}</div>
                </div>`
            let el = $(se)
            if (/.+(?=\.jpe?g$|\.png$|\.gif$)/i.test(file)) {
                let path = current_url + file
                let im_sub = '<img src="' + path + '" class="img_thumbnail img-thumbnail rounded-3 " alt="' + path + '">'
                im_sub = $(im_sub)
                el.children('a').empty().prepend(im_sub)
            }
            main.append(el)
        }
        // $('#main_block .badge').addClass('need-blur-2')
        $('#main_block .badge').click(file_name_clicked)
        $('footer > .d-flex').children().eq(0).remove()
        p.test(current_url)
        let sub_url = RegExp.$2
        let previous_url = RegExp.$1
        if (sub_url.endsWith('/')) {
            sub_url = sub_url.substr(0, sub_url.length - 1)
        }
        if (sub_url) {
            let at = sub_url.lastIndexOf('/')
            if (at >= 0) {
                previous_url += sub_url.substr(0, at)
            }
        }
        let last_dir = d.last_dir
        if (last_dir) {
            let se = '<a href="' + previous_url + '">\
                    <i class="bi mx-1 bi-chevron-left" style="font-size: 1rem;"></i>\
                    </a>'
            $('footer > .d-flex').prepend($(se))
        }
        else {
            $('footer > .d-flex').prepend($('<i class="bi mx-2 bi-slash-circle-fill" style="font-size: 1rem;"></i>'))
        }
        let number = dires.length + files.length + links.length
        $('#top_dev').text(_account + ' | ' + number + ' items')

        $('canvas').width($(window).width())
    }).fail(function () {
        show_error('fail to post')
    })
}
$('#refresh_a').click(update_all)
update_all()
var _current_dir = $('#refresh_a').text()
var _account = $('#top_dev').text()

var _in_warning = null
function show_error(msg) {
    if (_in_warning != null) {
        clearTimeout(_in_warning)
        _in_warning = null
        msg = $('#refresh_a').text() + " | " + msg
    }
    $('#refresh_a').text(msg)
    $('footer').css('transition-duration', '0.6s')
    $('footer').css('background-color', 'rgba(255, 37, 37, 0.8)')

    _in_warning = setTimeout(function () {
        _in_warning = setTimeout(function () {
            $('footer').css('transition-duration', '10s')
            $('footer').css('background-color', 'rgba(255, 255, 255, 0.05)')
            _in_warning = setTimeout(function () {
                $('#refresh_a').text(_current_dir)
                _in_warning = null
            }, 10000)
        }, 2000)
    }, 600)
}
function show_info(msg) {
    if (_in_warning != null) {
        clearTimeout(_in_warning)
        _in_warning = null
        msg = $('#refresh_a').text() + " | " + msg
    }
    $('#refresh_a').text(msg)
    $('footer').css('transition-duration', '0.6s')
    $('footer').css('background-color', 'rgba(37, 255, 37, 0.8)')

    _in_warning = setTimeout(function () {
        _in_warning = setTimeout(function () {
            $('footer').css('transition-duration', '10s')
            $('footer').css('background-color', 'rgba(255, 255, 255, 0.05)')
            _in_warning = setTimeout(function () {
                $('#refresh_a').text(_current_dir)
                _in_warning = null
            }, 10000)
        }, 2000)
    }, 600)
}
$('#new_folder').click(function () {
    $('#modal_new_folder').modal('toggle')
})

function request_create_new_folder() {
    $('.modal-footer button').addClass('disabled')
    let name = $('#new_folder_name').val()
    let pack = { dires: [name] }
    let s1 = window.location.href
    let p = RegExp('.+/pulls/my/(.*$)')
    var action = "/pulls/folder/";
    if (p.test(s1)) {
        action += RegExp.$1;
    }
    else {
        show_error('internal error')
        return;
    }

    $.post(action, pack, function (d, s) {
        if (s != 'success' || d['ok' < 0]) {
            let s = 'error：' + d['ok'] + ':' + d['msg']
            console.log(s)
            show_error(s)
            return;
        }
        update_all()
        $('#modal_new_folder').modal('hide')
    })
}
$('#modal_new_folder').on('hidden.bs.modal', function () {
    $('#new_folder_name').val('')
    $('.modal-footer button').removeClass('disabled')
})

$('#create_folder_btn').click(request_create_new_folder)


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


// drag and drop
$('#main_block').on('dragenter', function (e) {
    e.preventDefault()
    e.stopPropagation()
    console.info('enter')
})
$('#main_block').on('dragover', function (e) {
    e.preventDefault()
    e.stopPropagation()
    console.info('over')
})
$('#main_block').on('drop', function (e) {
    e.preventDefault()
    e.stopPropagation()
    console.info('enter')
    let file = e.originalEvent.dataTransfer.files
    if (file.length == 0)
        return;
    console.log(file)
    $('#upload_files').prop('files', file)
    easyUpload();
})

$('.modal-dialog-centered').parent().on('show.bs.modal', function () {
    $(this).find('.modal-content').addClass('animate__faster animate__animated animate__zoomIn')
})