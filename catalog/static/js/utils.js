
/* Extra init calls */

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