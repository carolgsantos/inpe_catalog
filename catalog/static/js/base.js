var geojsonLayer = 0;
var geojsonGcpsLayer = 0;
var geojsonWrssLayer = 0;
var imgsArray = []
var checkedProviders = {}

/* DEFAULT */

toastr.options = {
    "closeButton": true,
    "debug": false,
    "newestOnTop": true,
    "progressBar": false,
    "positionClass": "toast-top-right-padding",
    "preventDuplicates": true,
    "onclick": null,
    "showDuration": "300",
    "hideDuration": "1000",
    "timeOut": "5000",
    "extendedTimeOut": "1000",
    "showEasing": "swing",
    "hideEasing": "linear",
    "showMethod": "fadeIn",
    "hideMethod": "fadeOut"
}

toastr.options.onShown = function () {
    toastrTittle = $(".toast-title").text();
    toastrMessage = $(".toast-message").text();
    $('#notifyList').prepend(`<div class="alert alert-secondary alert-dismissible fade show" role="alert">
                                    <strong>${toastrTittle}</strong> ${toastrMessage}
                                    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                                        <span aria-hidden="true">&times;</span>
                                    </button>
                                </div>`);
}

$(document).ready(function () {

    // Empty dropdown options
    option = `<option value="" selected="selected"></option>`
    $(option).appendTo($('#bandSelect'));
    $(option).appendTo($('#collectionIdSelect'));
    $(option).appendTo($('#radiometricProcessingSelect'));
    $(option).appendTo($('#typeSelect'));

    // Datepickers filter
    $('input').filter('.datepicker-start').each(function () {
        $(this).datepicker($.extend({
            onSelect: function () {
                var minDate = $(this).datepicker('getDate');
                minDate.setDate(minDate.getDate());
                $("#endPicker" + $(this).data().bind).datepicker("option", "minDate", minDate);
            }
        }, { dateFormat: "yy-mm-dd" }));
    });
    $('input').filter('.datepicker-end').each(function () {
        $(this).datepicker($.extend({
            onSelect: function () {
                var maxDate = $(this).datepicker('getDate');
                maxDate.setDate(maxDate.getDate());
                $("#startPicker" + $(this).data().bind).datepicker("option", "maxDate", maxDate);
            }
        }, { dateFormat: "yy-mm-dd" }));
    });
});

/* MAP */

var map = L.map('map').setView([-15.22, -53.23], 5);

var openStreetMapDefault = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: 'Map data &copy; OpenStreetMap contributors'
});

var openTopoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 17,
    attribution: 'Map data: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
});

var googleSat = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
});

var googleHybrid = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
});

var googleStreets = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
});

var googleTerrain = L.tileLayer('http://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
});

var baseLayers = {
    'OpenStreetMap': openStreetMapDefault,
    'OpenTopoMap': openTopoMap,
    'Google-Satellite': googleSat,
    'Google-Hybrid': googleHybrid,
    'Google-Streets': googleStreets,
    'Google-Terrain': googleTerrain,
}

baseLayers['OpenStreetMap'].addTo(map);

var options = {
    sortLayers: true,
    collapsed: true
}

L.control.layers(baseLayers, null, options).addTo(map);

map.zoomControl.setPosition('topright');
map.createPane('bbox').style.zIndex = 320;
map.createPane('geojson').style.zIndex = 350;

var drawnItems = new L.LayerGroup().addTo(map);

var drawControl = new L.Control.Draw({
    draw: {
        polygon: false,
        marker: false,
        circlemarker: false,
        polyline: false,
        circle: false,
        rectangle: {
            shapeOptions: {
                color: '#000',
                opacity: .2,
                fillOpacity: 0.1
            }
        }
    },
    edit: false,
    position: 'topright'
});

map.addControl(drawControl);

map.on('draw:drawstart', function (e) {
    drawnItems.clearLayers();
});

map.on('draw:created', function (e) {
    var layer = e.layer;
    layer.options.pane = 'bbox'
    drawnItems.addLayer(layer);
    $('#bboxw').val(layer.getBounds().getWest());
    $('#bboxs').val(layer.getBounds().getSouth());
    $('#bboxe').val(layer.getBounds().getEast());
    $('#bboxn').val(layer.getBounds().getNorth());
});

/* SIDEBARS */

var sidebar = $('#sidebar').sidebar();

var tableSidebar = L.control.sidebar('sidebar-right', { position: 'right' }).addTo(map);

/* MAP BUTTONS */

L.easyButton({
    id: 'showAll',
    position: 'topright',
    states: [{
        stateName: 'show-all',
        title: 'Show all quicklooks',
        icon: 'fa-eye',
        onClick: function (button, map) {
            if (imgsArray.length != 0) {
                $.each(imgsArray, function (key, layer) {
                    if (!layer._quicklook) {
                        layer.fireEvent('click');
                        button.state('hide-all');
                    }
                });
            } else {
                toastr.warning('No layers available to show', 'Warning:')
            }
        }
    }, {
        stateName: 'hide-all',
        icon: 'fa-eye-slash',
        title: 'Hide all quicklooks',
        onClick: function (button, map) {
            $.each(imgsArray, function (key, layer) {
                if (layer._quicklook) {
                    layer.fireEvent('click');
                    button.state('show-all');
                }
            });
        },
    }]
}).addTo(map);

L.easyButton({
    id: 'removeAll',
    position: 'topright',
    leafletClasses: true,
    states: [{
        stateName: 'remove',
        title: 'remove layers',
        icon: 'fa-trash',
        onClick: function (button, map) {
            button.state('add');
            map.removeLayer(geojsonGcpsLayer);
            map.removeLayer(geojsonWrssLayer);
            map.removeLayer(geojsonLayer);
            $('#accordion-results').empty();
        }
    }]
}).addTo(map);

L.easyButton({
    id: 'showTable',
    position: 'topright',
    leafletClasses: true,
    states: [{
        stateName: 'shown',
        title: 'Show table',
        icon: 'fa-table',
        onClick: function (button, map) {
            tableSidebar.show();
            button.state('hidden');
        }
    }, {
        stateName: 'hidden',
        title: 'Hide table',
        icon: 'fa-times',
        onClick: function (button, map) {
            tableSidebar.hide();
            button.state('shown');
        },
    }]
}).addTo(map);

/* FEATURES */

function onEachFeature(feature, layer) {
    layer._leaflet_id = feature.properties.title;
    layer._properties = feature.properties;
    html = `<b>${layer._leaflet_id}</b><br>
            <table class="table">
            <tbody>`
    if (feature.properties.type == 'IMAGES') {
        imgsArray.push(layer)
        html += `<tr>
            <th scope="row">Date</th>
            <td>${feature.properties.date}</td>
          </tr>
          <tr>
            <th scope="row">Path</th>
            <td>${feature.properties.path}</td>
          </tr>
          <tr>
            <th scope="row">Row</th>
            <td>${feature.properties.row}</td>
          </tr>
          <tr>
            <th scope="row">Satellite</th>
            <td>${feature.properties.satellite}</td>
          </tr>
          <tr>
            <th scope="row">Sensor</th>
            <td>${feature.properties.sensor}</td>
          </tr>
          <tr>
            <th scope="row">Cloud Coverage</th>
            <td>${feature.properties.cloud}</td>
          </tr>
          <tr>
            <th scope="row">Provider</th>
            <td>${feature.properties.provider}</td>
          </tr>`
    } else if (feature.properties.type == 'GCPS') {
        html += `<tr>
                    <th scope="row">Satellite</th>
                    <td>${feature.properties.satellite}</td>
                </tr>
                <tr>
                    <th scope="row">Sensor</th>
                    <td>${feature.properties.sensor}</td>
                </tr>`
    } else {
        $.each(feature.properties, function (key, value) {
            prop = `<tr>
                        <th scope="row">${key.substr(0, 1).toUpperCase() + key.substr(1)}</th>
                        <td>${value}</td>
                    </tr>`
            html += prop
        });
    }

    html += `</tbody>
      </table>`
    layer.bindPopup(html)

    if (feature.properties.type != 'GCPS') {
        layer.setStyle({ fillOpacity: 0.01, opacity: 0.8 });
    }

    if (feature.properties.type != 'WRSS') {
        layer.on('click', function (e) {
            layer.closePopup();
            $('#' + feature.properties.title + '_ql').find('span').toggleClass('fa-eye-slash fa-eye');
            if (layer._quicklook) {
                map.removeLayer(layer._quicklook);
                layer._quicklook = null;
            } else {
                var imgUrl = feature.properties.icon;
                if (imgUrl == '') {
                    imgUrl = 'static/img/noimage.jpg'
                }
                var anchor = [[feature.properties.tl_latitude, feature.properties.tl_longitude],
                [feature.properties.tr_latitude, feature.properties.tr_longitude],
                [feature.properties.br_latitude, feature.properties.br_longitude],
                [feature.properties.bl_latitude, feature.properties.bl_longitude]]
                layer._quicklook = L.imageTransform(imgUrl, anchor).addTo(map)
            }
        });
    }

    layer.on('contextmenu', function (e) {
        layer.openPopup();
    });
    layer.on('remove', function (e) {
        if (layer._quicklook) {
            map.removeLayer(layer._quicklook);
            layer._quicklook = null;
        }
    });
}

/* PROVIDERS AND DROPDOWNS */

$.each(providers, function (key, data) {
    $.ajax({
        url: data.url,
        async: false,
        success: function (response) {
            checkedProviders[key] = data;
            $('#providersCheck').append(`<div class="form-check">
                                    <input class="form-check-input" type="checkbox" value="${data.url}" id="${key}" checked>
                                    <label class="form-check-label" for="defaultCheck1">${key}
                                    </label></div>`);
            $("#" + key).click(function () {
                if ($(this).is(":checked")) {
                    checkedProviders[key] = data;
                } else {
                    delete checkedProviders[key];
                }
            });
            if (data.type == 'opensearch') {
                fillSearchDropdowns(response)
            };
        },
        error: function (response) {
            $('#providersCheck').append(`<div class="form-check">
                                    <input class="form-check-input" type="checkbox" value="${data.url}" id="${key}" disabled>
                                    <label class="form-check-label" for="defaultCheck1">${key}
                                    </label></div>`);
            toastr.warning('Cannot connect with provider ' + key + '.', 'Warning:')
        },
        complete: function (response) {
            if (key == Object.keys(providers)[Object.keys(providers).length - 1]) {
                if (Object.keys(checkedProviders).length == 0) {
                    toastr.error('Cannot connect with any provider', 'Error:')
                }
            }
        }
    });
});

function fillSearchDropdowns(xml) {
    $(xml).find('OpenSearchDescription').each(function () {
        $(this).find('Url').each(function () {
            $(this).find('Parameter').each(function () {
                var name = $(this).attr("name")
                if (name == "dataset") {
                    $(this).find("Option").each(function () {
                        var value = $(this).attr("value");
                        $('<option />', { value: value, text: value }).appendTo($('#collectionIdSelect'));
                    })
                } else if (name == "band") {
                    $(this).find("Option").each(function () {
                        var value = $(this).attr("value");
                        $('<option />', { value: value, text: value }).appendTo($('#bandSelect'));
                    })
                } else if (name == "radiometricProcessing") {
                    $(this).find("Option").each(function () {
                        var value = $(this).attr("value");
                        $('<option />', { value: value, text: value }).appendTo($('#radiometricProcessingSelect'));
                    })
                } else if (name == "type") {
                    $(this).find("Option").each(function () {
                        var value = $(this).attr("value");
                        $('<option />', { value: value, text: value }).appendTo($('#typeSelect'));
                    })
                }
            })
        })
    })
    $(".custom-select option").each(function () {
        var $option = $(this);
        $option.siblings()
            .filter(function () { return $(this).val() == $option.val() })
            .remove()
    })
}

/* SEARCH */

$(function () {
    $('#searchForm').on('submit', function (event) {
        event.preventDefault();
        var loader = new Loader($('#searchSubmit'))
        $('#accordion-results').empty();
        $.ajax({
            url: host_url + 'query',
            type: 'get',
            data: $(this).serialize() + '&providers=' + JSON.stringify(checkedProviders),
            dataType: "json",
            success: function (data) {
                map.removeLayer(geojsonLayer);
                geojsonLayer = L.geoJson(data, {
                    onEachFeature: onEachFeature,
                    pane: 'geojson'
                }).addTo(map);
                $.each(data.providers, function (key, data) {
                    if (data.totalResults == 0) {
                        toastr.info('No results available for provider ' + data.provider + '.', 'Info:')
                    } else {
                        $('#accordion-results').append(`<div class="card">
                                                            <div class="card-header card-collapse" id="heading${data.provider}" data-toggle="collapse" data-target="#collapse${data.provider}">
                                                                <h5>${data.provider} <span class="badge badge-primary badge-right">${data.totalResults}</span></h5>
                                                            </div>
                                                            <div id="collapse${data.provider}" class="collapse show">
                                                                <div id="resultList${data.provider}"></div>
                                                            </div>
                                                        </div>`);
                    }
                });
                $.each(data.features, function (key, feature) {
                    var prop = feature.properties;
                    var card = `<div class="margin-tb">
                                            <div class="card">
                                                <div class="row"> 
                                                    <div class="col-4">
                                                        <img class="w-100" src="${prop.icon}" >
                                                    </div>
                                                    <div class="col-8 nopadding-left">
                                                        <div class="card-body nopadding-left">
                                                            <p class="card-title"><b>${prop.title}</b></p>
                                                            <div class="btn-group">
                                                                <button type="button" class="btn btn-light quicklook" value="${prop.title}" id=${prop.title}_ql data-toggle="tooltip" data-placement="top" title="Show quicklook"><span class="fa fa-eye-slash"></span></button>
                                                                <button type="button" class="btn btn-light centralize" value="${prop.title}" id=${prop.title}_center data-toggle="tooltip" data-placement="top" title="Centralize to quicklook"><span class="fa fa-dot-circle-o"></span></button>
                                                                <button type="button" class="btn btn-light info" value="${prop.title}" id=${prop.title}_info data-toggle="tooltip" data-placement="top" title="Show info card"><span class="fa fa-info"></span></button>
                                                                <a role="button" class="btn btn-light" id=${prop.title} data-toggle="modal" data-target="#modal" target="_blank" data-toggle="tooltip" data-placement="top" title="Show download list"><span class="fa fa-download"></span></a
                                                            </div>
                                                            </br>
                                                            <div class="btn-group">
                                                                <button type="button" class="btn btn-success gcps" name="L8" value="${prop.title}" id=${prop.title}_gcps data-toggle="tooltip" data-placement="top" title="Extract control points from Landsat"><span class="fa fa-map-marker"></span></button>
                                                                <button type="button" class="btn btn-info gcps" name="S2" value="${prop.title}" id=${prop.title}_gcps2 data-toggle="tooltip" data-placement="top" title="Extract control points from Sentinel"><span class="fa fa-map-marker"></span></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>`;
                    $('#resultList' + prop.provider).append(card);
                    $('#' + prop.title).click(prop.enclosure, function (object) {
                        $('#modalBody').empty();
                        var itemsList = $('<div/>').addClass('list-group');
                        $.each(object.data, function (index, value) {
                            var color = "#FFFFFF"
                            switch (value.band) {
                                case 'blue':
                                    color = "#A9D0F5"
                                    break;
                                case 'green':
                                    color = "#CCE5CC"
                                    break;
                                case 'red':
                                    color = "#FFCCCC"
                                    break;
                            }
                            var item = `<a href="${value.url}" class="list-group-item list-group-item-action flex-column align-items-start" style="background-color: ${color}">
                                                    <div class="d-flex w-100 justify-content-between">
                                                    <h5 class="mb-1">${prop.title}</h5>
                                                    <small class="text-muted">${value.type}</small>
                                                        </div>
                                                        <p class="mb-1">${value.band}</p>
                                                    <div class="d-flex w-100 justify-content-between">
                                                        <small class="text-muted">Radiometric Processing ${value.radiometric_processing}</small>
                                                    <i class="fa fa-download"></i>
                                                    </div>
                                                </a>`;
                            itemsList.append(item);
                        });
                        $('#modalBody').append(itemsList);
                        $("[data-toggle='popover'").popover();
                    });
                });
            },
            error: function (data) {
                toastr.error('Cannot search images from providers.', 'Error:')
            },
            complete: function () {
                loader.stop()
            }
        });
    });
});

$(document).on('click', '.quicklook', function () {
    var layer = geojsonLayer.getLayer($(this).attr('value'));
    layer.fireEvent('click');
    layer.bringToFront();
});

$(document).on('click', '.info', function () {
    geojsonLayer.getLayer($(this).attr('value')).openPopup();
});

$(document).on('click', '.centralize', function () {
    map.fitBounds(geojsonLayer.getLayer($(this).attr('value')).getBounds());
});

$(document).on('click', '.gcps', function () {
    var layer = geojsonLayer.getLayer($(this).attr('value'));
    var satellite = $(this).attr('name')
    var loader = new Loader($(this))
    $.ajax({
        type: "GET",
        url: host_url + 'getgcps',
        data: {
            west: layer.getBounds().getWest(),
            south: layer.getBounds().getSouth(),
            east: layer.getBounds().getEast(),
            north: layer.getBounds().getNorth(),
            count: $('#count').val(),
            satellite: satellite
        },
        dataType: "json",
        success: function (data) {
            map.removeLayer(geojsonGcpsLayer);
            if (satellite == 'L8') {
                color = 'green'
                toastr.info('Total extracted points from Landsat:' + data.count.toString(), '[' + moment().format('hh:mm:ss') + ']')
            } else {
                color = 'blue'
                toastr.info('Total extracted points from Sentinel:' + data.count.toString(), '[' + moment().format('hh:mm:ss') + ']')
            }
            geojsonGcpsLayer = L.geoJson(data, {
                onEachFeature: onEachFeature,
                pane: 'geojson',
                pointToLayer: function (feature, latlng) {
                    var myIcon = L.icon({
                        iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-' + color + '.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    });
                    return L.marker(latlng, { icon: myIcon });
                }
            }).addTo(map).bringToFront()
        },
        error: function (data) {
            toastr.error('Cannot extract control points from scene.', 'Error:')
        },
        complete: function () {
            loader.stop()
        }
    });
});

/* GCPS */

$('#getgcps').click(function () {
    var loader = new Loader($(this))
    var data = $('#searchForm').serializeArray().reduce(function (obj, item) {
        obj[item.name] = item.value;
        return obj;
    }, {});
    $.ajax({
        type: "GET",
        url: host_url + 'getgcps',
        data: {
            west: data['west'],
            south: data['south'],
            east: data['east'],
            north: data['north'],
            count: data['count'],
            satellite: $("#satellitePoints").val()
        },
        dataType: "json",
        success: function (data) {
            map.removeLayer(geojsonGcpsLayer);
            geojsonGcpsLayer = L.geoJson(data, {
                onEachFeature: onEachFeature,
                pane: 'geojson',
                pointToLayer: function (feature, latlng) {
                    if (feature.properties.satellite == 'L8') {
                        color = 'green'
                    } else {
                        color = 'blue'
                    }
                    var myIcon = L.icon({
                        iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-' + color + '.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    });
                    return L.marker(latlng, { icon: myIcon });
                }
            }).addTo(map).bringToFront()
            toastr.info('Total extracted points:' + data.count.toString(), '[' + moment().format('hh:mm:ss') + ']')
        },
        error: function (data) {
            toastr.error('Cannot extract control points.', 'Error:')
        },
        complete: function () {
            loader.stop()
        }
    });
});

/* WRSS */

$('#getwrss').click(function () {
    var loader = new Loader($(this))
    $.ajax({
        type: "GET",
        url: host_url + 'getwrss',
        data: $('#searchForm').serialize() + '&satellite=' + $("#satellitePoints").val(),
        dataType: "json",
        success: function (data) {
            map.removeLayer(geojsonWrssLayer);
            geojsonWrssLayer = L.geoJson(data, {
                onEachFeature: onEachFeature,
                pane: 'geojson'
            }).addTo(map);
        },
        error: function (data) {
            toastr.error('Cannot extract WRSs.', 'Error:')
        },
        complete: function () {
            loader.stop()
        }
    });
});


/* EXECUTIVE */

$('#execForm').on('submit', function (event) {
    var loader = new Loader($('#execSubmit'))
    var drds = []
    var selectedDrds = $('#jstreeContainer').jstree("get_selected", true)
    $.each(selectedDrds, function (key, node) {
        if (node.original.type == "file") {
            drds.push(node.original.path + '/' + node.text)
        }
    });
    $.ajax({
        type: 'GET',
        url: 'http://cbers2.dpi.inpe.br:5010/process',
        data: 'drd=' + drds[0],
        dataType: "json",
        success: function (data) {
            toastr.info('Started process for DRD ' + drds[0], 'New Process:')
        },
        error: function (data) {
            toastr.error('Cannot connect with maestro to start process.', 'Error:')
        },
        complete: function () {
            loader.stop()
        }
    });
});

$("#showdrds").click(function () {
    var loader = new Loader($(this))
    let satList = $('#satellite input[type="checkbox"]').map(function () {
        if ($(this).is(':checked')) {
            return [this.value];
        }
    }).get();
    let instList = $('#instrument input[type="checkbox"]').map(function () {
        if ($(this).is(':checked')) {
            return [this.value];
        }
    }).get();
    console.log($("#execForm").serialize() + '&sat=' + satList + '&inst=' + instList)
    $.ajax({
        type: 'GET',
        url: 'http://cbers2.dpi.inpe.br:5010/drds',
        data: $("#execForm").serialize() + '&sat=' + satList + '&inst=' + instList,
        dataType: "json",
        crossDomain: true,
        success: function (data) {
            if (data.drds == '') {
                toastr.error('No DRDs available', 'Error:')
            } else {
                $('#jstreeContainer').data('jstree', false).empty()
                $('#jstreeContainer').jstree({
                    'core': {
                        'data': data.drds
                    }
                });
                $('#jstreeContainer').on("changed.jstree", function (e, data) {
                    var drdListStr = ''
                    var drdList = []
                    var selectedDrds = $(this).jstree("get_selected", true)
                    $.each(selectedDrds, function (key, node) {
                        if (node.original.type == "file") {
                            if (drdListStr != '') {
                                drdListStr += ';'
                            }
                            drdListStr += node.text
                            drdList.push(node.text)
                        }
                    });
                    $('#drd').val(drdListStr)
                    console.log(drdList)
                    $table.bootstrapTable("uncheckAll")
                    $table.bootstrapTable("checkBy", { field: "drd", values: drdList })
                });
            }
        },
        error: function (data) {
            toastr.error('Cannot connect with maestro to get DRDs.', 'Error:')
        },
        complete: function () {
            loader.stop()
        }
    });
});

/* ACTIVITIES */
// http://bootstrap-table.wenzhixin.net.cn/documentation/#localizations

var $table = $('#table');

$table.bootstrapTable({
    url: maestro_url + 'inspect',
    rowStyle: "rowStyle",
    sortName: "app",
    sortOrder: "asc",
    search: "true",
    searchOnEnterKey: "true",
    showRefresh: "true",
    // detailView: "true",
    // detailFormatter: "detailFormatter",
    minimumCountColumns: "2",
    pagination: "true",
    showPaginationSwitch: "true",
    sidePagination: "server",
    silentSort: "true",
    toolbar: "#toolbar",
    clickToSelect: "true",
    buttonsClass: "light",
    columns: [{
        field: 'state',
        checkbox: 'true'
    }, {
        field: 'app',
        title: 'App',
        sortable: 'true'
    }, {
        field: 'status',
        title: 'Status',
        sortable: 'true'
    }, {
        field: 'drd',
        title: 'DRD',
        sortable: 'true'
    }, {
        field: 'start',
        title: 'Start',
        sortable: 'true'
    }, {
        field: 'end',
        title: 'End',
        sortable: 'true'
    }, {
        field: 'elapsed',
        title: 'Elapsed',
        sortable: 'true'
    }, {
        field: 'retcode',
        title: 'Retcode',
        sortable: 'true'
    }, {
        field: 'workorder',
        title: 'Workorder',
        sortable: 'true'
    }],
    // onCheck: function (row, $element) {
    //     console.log(row)
    // },
    // onCheckAll: function (row, $element) {
    //     console.log(row)
    // }
});

function detailFormatter(index, row) {
    const html = [];
    $.each(row, (key, value) => {
        html.push(`<p><b>${key}:</b> ${value}</p>`);
    });
    return html.join('');
}

function rowStyle(row, index) {
    switch (row.status) {
        case 'DONE':
            color = 'table-success'
            break;
        case 'DOING':
            color = 'table-info'
            break;
        case 'NOTDONE':
            color = 'table-warning'
            break;
        case 'ERROR':
            color = 'table-danger'
            break;
        default:
            color = 'table-active'
            break;
    }
    return {
        classes: color
    };
}