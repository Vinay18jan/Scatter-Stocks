/**
 * Initialize UI Components and Pre-Load Components
 */
$(document).ready(function () {
    $('.ui.accordion').accordion();

    //google.charts.load("current", { packages: ["corechart"] });
    d3.select(window).on('resize', debounce(function () { generateGraph() }, 100))

    $("#searchevent").keyup(function (event) {
        if (event.keyCode === 13) {

            console.log("on enter")
            console.log($("#searchevent").val())
            let text = $("#searchevent").val();
            if (text) {
                console.log("Getting headlines for ", text)
                fetchAndPopulateHeadlines(text);
            }

        }
    });

    $("#calendarDisplay").html(new moment().format("MM/DD/YY"))

    $("#calendarButton").calendar({
        type: "date",
        onChange: function (date, text, mode) {

            let selectedDate = new moment(date);
            $("#calendarDisplay").html(selectedDate.format("MM/DD/YY"))
            let currentDate = new moment(Date.now());

            if (selectedDate.isAfter(currentDate)) {
                alert("Whoa Nelly, you can't create an event in the future");
                return false;
            }
        }
    });

    $("#calendarButton").calendar("set date", new Date())

    function debounce(func, wait) {
        wait = wait || 0
        var timeout
        return function () {
            var later = function () {
                timeout = null
                func(arguments)
            }
            clearTimeout(timeout)
            timeout = setTimeout(later, wait)
        }
    }
});


function displayDatePicker() {
    $("#addManualArticleView").show();
}

function addManualArticle() {
    let headline = $("#articleInput").val();
    let publishDate = $("#calendarButton").calendar("get date")
    publishDate = new moment(publishDate).format("MM/DD/YY");
    let key = new Date().getTime();
    if (!headline) {
        alert("You can't leave the headline empty!")
        return;
    }

    //Mimic an Actual Article from the API
    SELECTED_ARTICLES[key] = {
        headline: {
            main: headline
        },
        pub_date: publishDate
    };
    let item = Mustache.render(SELECTED_LABEL_TEMPLATE, { id: key, labelName: headline + " - " + publishDate });
    $("#selected-articles").prepend(item)
    $("#delete-label-" + key).click(onDeleteSelectedArticle)
    $("#addManualArticleView").hide();
}





