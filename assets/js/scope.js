function current_date_time(now = null, d_day = 0, d_hour = 0, d_min = 0) {
    if (now == null)
        now = new Date()
    let delta = (d_day * 24 * 60 + d_hour * 60 + d_min) * 60000
    now = new Date(now.getTime() + delta)
    let date = [now.getMonth() + 1, now.getDate()]
    let s = '' + now.getFullYear()
    for (let i in date) {
        let sn = '' + date[i]
        if (sn.length < 2)
            sn = '0' + sn
        s += '-' + sn
    }
    s += ' '
    let h = now.getHours() + ""
    if (h.length < 2)
        h = '0' + h
    s += h
    date = [now.getMinutes(), now.getSeconds()]
    for (let i in date) {
        let sn = '' + date[i]
        if (sn.length < 2)
            sn = '0' + sn
        s = s + ':' + sn
    }
    return s
}

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
url_dev_list = '/polls/devlist/'
url_dev_data = '/polls/data/'

var tabs = ['#device_sence_select', '#time_sence_select', '#export_sence_select', '#chart_sence_select']
var tab_triggers = $('#nav_tabs btn')
var now_tab = null
var now_tab_content = null

var charts = {}
var charts_opts = {}
var last_tick = 1

on_load_dev_data = 0

tab_triggers.each(function (i, el) {
    $(this).click(function () {
        if (now_tab == null) {
            $(this).addClass('active')
            now_tab = $(this)
            now_tab_content = $(tabs[i])
            now_tab_content.collapse('show')
            return;
        }
        let id = now_tab_content.attr('id')
        let this_id = $(tabs[i]).attr('id')
        if (this_id == id) {
            now_tab.toggleClass('active')
            now_tab_content.collapse('toggle')
            return;
        }
        now_tab.removeClass('active')
        now_tab_content.collapse('hide')
        $(this).addClass('active')
        now_tab = $(this)
        now_tab_content = $(tabs[i])
        now_tab_content.collapse('show')
    })
})

function find_selected_devices() {
    var ns = []
    $('#device_hori_slider small.bg-primary').each(function () {
        ns.push($(this).text())
    })
    return ns
}

function charts_resize() {
    for (let i in charts) {
        charts[i].resize();
    }
    let p = $('#device_hori_slider')
    var el = p.get(0)
    if (el.scrollWidth > el.clientWidth) {

        p.removeClass('justify-content-around')
        p.css('overflow', 'auto')
    }
    else {
        p.addClass('justify-content-around')
    }
}
window.addEventListener("resize", charts_resize);

$(window).load(function () {
})

function set_default() {

    let d = current_date_time(null, -1)
    let p = /(\d+-\d+-\d+) \d+:\d+:\d+/
    if (p.test(d)) {
        let s = RegExp.$1 + 'T00:00'
        $('#from_time').val(s)
    }
    d = current_date_time(null, 1)
    if (p.test(d)) {
        let s = RegExp.$1 + 'T00:00'
        $('#to_time').val(s)
    }
    $("#input_tags").val('temperature,humidity')
}

function get_time_range() {
    var from = $('#from_time').val()
    if (!from)
        return null
    var tags = $("#input_tags").val()
    if (!tags)
        return null;
    var to = $('#to_time').val()
    if (!to)
        to = current_date_time()
    var ts = $("#input_range").val()
    if (ts > 0) {
        // <!-- 15min,1hour,4hour,1day,1week,2week,1month -->
        var ts_options = [null, '0,' + 15 * 60, '0,3600', '0,' + 3600 * 4, "1,0", '7,0', '14,0', '30']
        ts = ts_options[ts]
    }
    else {
        ts = null;
    }
    var res = { from: from, to: to, step: ts, tags: tags }
    return res
}

function stop_spin() {

    $('.spinner-border').addClass('invisible')
    $("#run_btn").removeClass('invisible')
}

$("#run_btn").click(function (e) {
    if (on_load_dev_data)
        return;
    var args = get_time_range()
    if (args == null)
        return;
    var ns = find_selected_devices()
    var n = ns.length
    if (n == 0) {
        return;
    }
    var s = ns[0]
    if (n > 1) {
        s += '等' + n + '个设备'
    }
    $('#top_title').text(s)
    $('.spinner-border').removeClass('invisible')
    $(this).addClass('invisible')
    reset_table()
    let tags_list = args.tags.replace(' ', '').split(',')
    charts = {}
    charts_opts = {}
    $('#chart_views').empty()
    $('#alert_block').removeClass('alert-warning').addClass('alert-success')

    $("#waiting_scene h4").text('Loading data...')
    $("#waiting_scene p").text('this may take a few seconds')
    $("#waiting_scene").removeClass('d-none')
    for (let i = 0; i < n; i++) {
        for (let j in tags_list) {
            let tag = tags_list[j]
            on_load_dev_data++;
            get_samples(ns[i], args.from, args.to, args.step, tag)
        }
    }
    // setTimeout(stop_spin,z 1000);
})
$("#input_range").change(function (e) {
    let v = $(this).val()
    var ticks = $('#range_ticks > small')
    ticks.eq(last_tick).removeClass('rounded-3 bg-primary text-white px-1')
    last_tick = v
    ticks.eq(v).addClass('rounded-3 bg-primary text-white px-1')
})
$('#range_ticks > small').each(function (i, e) {
    $(this).click(function (e) {
        $("#input_range").val(i)
        let v = i
        var ticks = $('#range_ticks > small')
        ticks.eq(last_tick).removeClass('rounded-3 bg-primary text-white px-1')
        last_tick = v
        ticks.eq(v).addClass('rounded-3 bg-primary text-white px-1')
    })
})

$('#table_view_btn').click(function () {
    $(this).toggleClass('btn-outline-secondary btn-secondary')
    if ($(this).hasClass('btn-secondary')) {
        $('#chart_views').fadeOut('fast')
        $('#table_view').removeClass('d-none').fadeIn('fast')
    }
    else {
        $('#table_view').fadeOut('fast')
        $('#chart_views').fadeIn('fast')
    }
})

$('#export_sence_select > .col-4').click(function () {
    let type = $(this).text()
    $(type).click()
})
function add_device(name, nick) {
    if (!nick)
        nick = name
    var dev_circle = '<div class="d-flex flex-column justify-content-center align-items-center mx-2">\
        <div class=" rounded-circle g1 d-flex justify-content-center align-items-center ">\
            <span class="fg3 text-truncate">{nick}</span>\
        </div>\
        <small class="rounded-3 px-1 mt-1">{name}</small>\
    </div>'
    var s = dev_circle.replace('{nick}', nick)
    s = s.replace('{name}', name)
    let p = $('#device_hori_slider')
    let self = $(s)
    self.click(function (e) {
        let dev_name = $(this).find('small')
        dev_name.toggleClass('bg-primary text-white')
        // if (dev_name.hasClass('bg-primary')) {
        //     console.log(dev_name.text())
        // }
    })
    p.append(self)
}

function get_device_list() {
    // -> device:[(name,nick),...]
    $.post(url_dev_list, {}, function (d, s) {
        if (s != 'success') {
            return;
        }
        if (d['ok'] < 0) {
            return;
        }
        d = d.device
        for (let i in d) {
            add_device(d[i][0], d[i][1])
        }
        setTimeout(() => {
            let p = $('#device_hori_slider')
            var el = p.get(0)
            if (el.scrollWidth > el.clientWidth) {
                p.removeClass('justify-content-around')
                p.css('overflow', 'auto')
            }
        }, 200);


        if (!in_mobile)
            $('#device_hori_slider').getNiceScroll(0).resize()
        else
            $('#nav_tabs li').addClass('ms-auto')
        if (now_tab_content != null)
            return;
        now_tab_content = $(tabs[0])
        now_tab_content.collapse('show')
        now_tab = $('#nav_tabs btn:first')

    })
}
// if time is null, we assume data is like [(x,y)...]
// otherwise data is like [(max,min,mean)...]
var table_columns = 0 // column-0 is 'NO.'
var table_rows_count = 0;
var table_body = $('#table_body')

function new_table_column_head(tag) {
    let head = '<th>' + tag + '</th>'
    head = $(head)
    $('#table_head').append(head)
    table_columns++
    // table_columns_map[table_columns] = head
}

function new_table_row(tags) {
    let s = ''
    for (let t in tags) {
        s += '<td>' + tags[t] + '</td>'
    }
    let tr = '<tr>' + s + '</tr>'
    tr = $(tr)
    table_body.append(tr)
    table_rows_count++
}

// run once
function build_the_table() {
    if (charts_opts.length == 0)
        return;
    // first build tablehead
    // NO.| c1.x | c1.y | c2.x | c2.y1 | c2.y2 |
    for (let title in charts_opts) {
        let legends = charts_opts[title]['legend']['data']
        new_table_column_head(title + '.x')
        for (let j = 0; j < legends.length; j++)
            new_table_column_head(title + '.' + legends[j])
    }
    // then fill the data
    // let end_rows = max_samples_count + 1
    for (let i = 0; i < max_samples_count; i++) {
        let row = [i + 1]
        for (let title in charts_opts) {
            let series = charts_opts[title]['series']
            let data = series[0].data
            let n = data.length // assert all series are same in length
            if (series.length == 1) {
                // (t,y)
                if (i >= n) {
                    row.push('') // t
                    row.push('') // y
                    continue; // next chart
                }
                let time_x = new Date(data[i][0])
                time_x = current_date_time(time_x)
                row.push(time_x)
                row.push(data[i][1])
                continue;// next chart
            }
            // [(x,max)...],[(x,min),...],[(x,mean),...]
            // ->
            // x,max,min,mean : in a row
            if (i >= n) {
                for (let x = 0; x < 4; x++)
                    row.push('') // t
                continue; // next chart
            }
            let time_x = new Date(data[i][0])
            time_x = current_date_time(time_x)
            row.push(time_x)
            for (let x = 0; x < 3; x++) {
                row.push(series[x].data[i][1])
            }
        }
        new_table_row(row)
    }
    let s = $('#top_title').text() + ' | ' + total_samples_count + '条记录'
    $('#top_title').text(s)
    $('table').tableExport({ bootstrap: true })
    $('caption').hide()
}

function reset_table() {
    $('caption').remove()
    table_body.empty()
    $('#table_head').html('<th>NO.</th>')
    table_columns = 0
    table_rows_count = 0
    max_samples_count = 0
    total_samples_count = 0
    total_series_count = 0
}
// samples statistics
var max_samples_count = 0;
var total_samples_count = 0;
var total_series_count = 0;

function get_samples(dev_name, from, to, time_step, tag) {
    // -> {ok,device,time,tag}
    let pack = {
        device: dev_name,
        from_time: from,
        to_time: to,
        step: time_step,
        tag: tag
    }
    if (time_step == null)
        delete pack.step
    $.post(url_dev_data, pack, function (data, s) {
        on_load_dev_data--;
        if (on_load_dev_data == 0) {
            if (!$("#waiting_scene").hasClass('d-none')) {
                $("#waiting_scene h4").text('No data')
                $("#waiting_scene p").text('')
            }
            stop_spin()
        }
        if (s != 'success') {
            return;
        }
        let ok = data["ok"]
        if (ok < 0) {
            return;
        }
        var n = data[tag].length
        if (n == 0) {
            return;
        }
        $("#waiting_scene").addClass('d-none')
        total_samples_count += n;
        if (n > max_samples_count)
            max_samples_count = n
        var title = dev_name + '.' + tag
        if (!charts[title]) {
            new_chart(title)
        }
        if (ok == 2) {
            // [(t,v),...]:nX2
            let d = data[tag]
            for (let i in d)
                d[i][0] =(d[i][0]-28800)*1000;
            if (d.length >= 1000) {
                $('#alert_block').removeClass('alert-success').addClass('alert-warning')
            }
            new_series(title, tag, data[tag])
            total_series_count++
            if (on_load_dev_data == 0) {
                build_the_table()
            }
            return;
        }
        var ts = data["time"]
        var val = data[tag]; // nX3

        for (let i in ts)
            ts[i] *= 1000;
        let ms = [[], [], []]
        for (let i = 0; i < ts.length; i++) {
            // let t = ;//new Date(ts[i])
            for (let j = 0; j < 3; j++) {
                // series J 
                ms[j].push([ts[i], val[i][j]])
            }
        }
        series_names = ['max', 'min', 'mean']
        total_series_count += 3
        for (let i = 0; i < 3; i++) {
            new_series(title, series_names[i], ms[i])
        }

        if (on_load_dev_data == 0) {
            build_the_table()
        }
    })
}

$(function () {
    set_default()
    get_device_list()
    if (!in_mobile)
        $('#device_hori_slider').niceScroll();
})

// $('#chart_sence_select button').click(toggle_button)
function toggle_button(self) {
    self.toggleClass('btn-outline-secondary btn-secondary')
    if (self.hasClass('btn-secondary')) { // On
        self.attr('data-on', 'on')
    }
    else {
        self.attr('data-on', null)
    }

}
$('#chart_config_indicator').click(function () {
    toggle_button($('#chart_config_indicator'))
    let symbol = 'none'
    if ($(this).attr('data-on')) {
        symbol = 'pin'
    }
    for (let chart_name in charts) {
        let chart = charts[chart_name]
        let opt = charts_opts[chart_name]
        for (let s of opt['series']) {
            s.symbol = symbol
        }
        chart.setOption(opt)
    }

})

$('#chart_config_full_scale').click(function () {
    toggle_button($(this))

    let val = true
    if ($(this).attr('data-on')) {
        val = false
    }
    for (let chart_name in charts) {
        let chart = charts[chart_name]
        let opt = charts_opts[chart_name]
        for (let s of opt['yAxis']) {
            s.scale = val
        }
        chart.setOption(opt)
    }

})

$('#chart_config_bartype').click(function () {
    toggle_button($(this))

    let val = 'line'
    if ($(this).attr('data-on')) {
        val = 'bar'
    }
    for (let chart_name in charts) {
        let chart = charts[chart_name]
        let opt = charts_opts[chart_name]
        for (let s of opt['series']) {
            if (!s.name.endsWith('.mean') && s.name != 'mean')
                continue;
            s.type = val;
        }
        chart.setOption(opt)
    }
})

$('#chart_config_only_mean').click(function () {
    toggle_button($(this))

    let val = true
    if ($(this).attr('data-on')) {
        val = false
    }
    for (let chart_name in charts) {
        let chart = charts[chart_name]
        let opt = charts_opts[chart_name]
        if (opt['series'].length == 1)
            return;
        for (let s of opt['series']) {
            if (!s.name.endsWith('.mean') && s.name != 'mean') {

                if (opt.legend.selected == undefined)
                    opt.legend.selected = {}
                opt.legend.selected[s.name] = val
            }
        }
        chart.setOption(opt)
    }
})

// given chart name or title and series name, data
// append the series to current chart
function new_series(chart_name, name, data) {
    let need_symbol = $('#chart_config_indicator').attr('data-on') == 'on' ? 'pin' : 'none'
    var ser = {
        name: name,
        type: 'line',
        symbol: need_symbol,
        smooth:true,
        emphasis: {
            focus: 'series'
        },
        data: data
    }
    let chart = charts[chart_name]
    let opt = charts_opts[chart_name]
    opt['series'].push(ser)
    opt['legend']['data'].push(name)
    chart.setOption(opt)
    return ser
}


function dragstart_handler(ev) {
    // Add the target element's id to the data transfer object
    let title = ev.currentTarget.getAttribute('data-charts') //children[0].children[0].children[0].id // $(this).find('[id]').attr('id')
    // ev.target.id
    // console.log('transfer ' + title)
    ev.dataTransfer.setData("chart/title", title);
    ev.dataTransfer.dropEffect = "move";
}
function dragover_handler(ev) {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move"
}
function united_legend(title, legends) {
    for (let i in legends) {
        p = /(\w+)\.(.+)(\..+)?/ // device.sensor[.statics_type]
        let legend = legends[i]
        if (!p.test(legend)) {
            if (legends.length == 1)
                legends[i] = title
            else
                legends[i] = title + '.' + legend
        }
    }
}

function update_this_chart(title) {
    charts[title].setOption(charts_opts[title], true)
}
function drop_handler(ev) {
    ev.preventDefault();
    // Get the id of the target and add the moved element to the target's DOM
    var given_title = ev.dataTransfer.getData("chart/title");
    let this_title = ev.currentTarget.getAttribute('data-charts') //.children[0].children[0].children[0].id //$(this).find(['id']).attr('id')
    let this_series = charts_opts[this_title]['series']
    let this_legend = charts_opts[this_title]['legend']['data']
    // let self = $('#' + this_title).parentsUntil('[data-charts]').eq(1).parent()
    let self = $('[data-charts="' + this_title + '"]')
    // self.css('zoom','1')
    // self.removeClass('border-success border-danger')

    if (this_title == given_title) {
        // split the data
        let chart_title = charts_opts[this_title]['title']['text']
        let n = chart_title.indexOf('<-->')
        if (n < 0)
            return;
        let split_title = chart_title.substr(n + 4)
        chart_title = chart_title.substr(0, n)
        n = split_title.indexOf('<-->')
        if (n >= 0) {
            split_title = split_title.substr(0, n)
        }
        // change this chart view first

        let split_series = charts_opts[split_title]['series']
        for (let i = 0; i < split_series.length; i++) {
            this_legend.pop()
            this_series.pop()
        }
        charts_opts[this_title]['title']['text'] = chart_title
        // charts_opts[split_title]['title']['text'] = split_title
        // charts_opts[this_title]['series'] = this_series

        update_this_chart(this_title)
        // let self = $('#' + this_title).parentsUntil('[data-charts]').eq(1).parent()
        if (chart_title.indexOf('<-->') < 0) {
            self.removeClass('col-12 col-lg-12')
            // self.on('transitionrun', function () {
            //     charts[this_title].resize();
            // })
            // self.on('transitionend', function () {
            //     charts[this_title].resize();
            //     // self.off('transitionrun')
            //     self.off('transitionend')
            // })
            charts[this_title].resize();

        }
        // create or say resume a chart view
        let el = new_chart(split_title, true)
        self.after(el)
        var dom = document.getElementById(split_title);
        let chart = echarts.init(dom);
        chart.setOption(charts_opts[split_title]);
        charts[split_title] = chart;
        charts[this_title].resize();
        return;
    }

    let given_series = charts_opts[given_title]['series']
    let given_legend = charts_opts[given_title]['legend']['data']
    for (let i in given_series) {
        this_series.push(given_series[i])
    }
    united_legend(this_title, this_legend)
    united_legend(given_title, given_legend)

    for (let i in given_legend)
        this_legend.push(given_legend[i])
    // reset the serial name
    for (let i in this_legend) {
        this_series[i]['name'] = this_legend[i]
    }
    // change the title
    charts_opts[this_title]['title']['text'] += '<-->' + charts_opts[given_title]['title']['text']
    charts_opts[this_title]['legend']['data'] = this_legend
    update_this_chart(this_title)
    // charts[this_title].setOption(charts_opts[this_title])
    let par = $('[data-charts="' + given_title + '"]')
    // let par = $('#' + given_title).parentsUntil('[data-charts]').eq(1).parent()
    par.addClass('animate__animated animate__zoomOut')
    par.on('animationend', function () {
        $(this).empty().remove()
        self.addClass('col-12 col-lg-12')
        charts[this_title].resize();
    })

}
//
// create a new chart and add it to html document
// given a title, which will be considred as ID of the element
// return chart object
function new_chart(title, no_append = false) {
    var chart_html = '<div draggable="true" ondragstart="dragstart_handler(event)"\
    ondrop="drop_handler(event)" ondragover="dragover_handler(event)" class="col animate__animated animate__zoomIn animate__faster mb-4"\
    style="transition:left 1000ms, top 1s,padding 1s,margin 1s, zoom 1s;">\
    <div class="card w-100 r-10 shadow">\
        <div class="card-body px-0 pt-1 pb-0">\
            <div id="{chart_id}" style="width:100%;height:100%;min-height:400px;"></div>\
        </div>\
    </div>\
    </div>'
    var option = {
        title: {
            text: title,
            textStyle: {
                overflow: 'truncate'
            }
        },
        tooltip: {
            show: true,
            trigger: 'axis',
            axisPointer: {
                type: 'line',
                axis: 'auto',
                snap: true,
            }
        },
        legend: {
            show: true,
            type: 'scroll',
            top: "6%",
            data: []
        },
        // toolbox: {
        //     feature: {
        //         dataView: {
        //             show: true
        //         },
        //         saveAsImage: {
        //             show: true
        //         }
        //     }
        // },
        dataZoom: [
            {
                type: 'slider',
                // start: 50,
                minSpan: 10
            }],
        grid: {
            left: 10,
            containLabel: true,
            bottom: "11%",
            top: "13%",
            right: 10
        },
        xAxis: [{
            type: 'time',
            splitNumber: 7
        }],
        yAxis: [{
            type: 'value',
            scale: true
        }],
        series: []
    };
    chart_html = chart_html.replace('{chart_id}', title)
    let self = $(chart_html)
    self.attr('data-charts', title)
    if (no_append)
        return self
    $('#chart_views').append(self)
    var dom = document.getElementById(title);
    let chart = echarts.init(dom);
    chart.setOption(option);
    charts[title] = chart;
    charts_opts[title] = option
    charts_resize();
    return chart
}

var url_logout = "/account/logout/"
// var url_auth = "/account/auth/"

function logout_this_account() {
    let token = $.cookie('utoken')
    if (!token) {
        // display_hint("got a problem(-226)")
        return;
    }
    $.get(url_logout, function (data, status) {
        if (status != "success") {
            display_hint('some thing went wrong(' + status + ")")
        }
        $.removeCookie('username')
        $.removeCookie('uname')
        $.removeCookie('utoken')
        // redirect 
        window.location.href = '/';
        return;
    })
}
$("#out_btn").click(logout_this_account);

function go_my_account() {
    // http://127.0.0.1:8000/pulls/my/eglwangAT163.com/
    var url = '/pulls/my/'
    window.location.href = url
}
$('.bi-gear-wide-connected').parent().next().children().eq(0).click(go_my_account)
/*
nx3 for a tag's data
mXnX3
device:{
    tags_list:['tag0','tag1',...,'tagN']
    tag0:[[max,min,mean],[m,m,m]...] nX3,
    tag1:[[max1,min1,mean1],[m,m,m]...] nX3,
            ...
    tagN:[[maxN,minN,meanN],[m,m,m]...] nX3,
    time:['2022-1-1 0:0:0','2022-1-1 0:15:0'...]1Xn
}
dev:{

    data:[[[max0,min0,mean0],[max1,min1,mean1]..],[t1,t2]....]nXmX3,
    tag:['tag1','tag2']},
    time:['2022-1-1 0:0:0','2022-1-1 0:15:0'...]1Xn



    <div draggable="true" ondragstart="dragstart_handler(event)"
     ondrop="drop_handler(event)" ondragover="dragover_handler(event)"
     class="col animate__animated animate__zoomIn animate__faster mb-4"
     style="transition:left 1000ms, top 1s,padding 1s,margin 1s, zoom 1s;">
        <div class="card w-100 r-10 shadow">
            <div class="card-body px-0 pt-1 pb-0">
                <div id="dev2.light" style="width:100%;height:100%;min-height:400px;">
                </div>
            </div>
        </div>
    </div>

*/