let LOCAL_TABLE = []
let LOCAL_LISTOFTICKS = [];

async function generateGraph() {

    let companiesSelected = USER_SELECTED_COMPANIES;

    //check if news Articles have been selected
    if (Object.keys(SELECTED_ARTICLES).length == 0) {
        alert("No Articles have been selected to generate a graph");
        $("#generate-button").removeClass("loading");
        $("#generate-button").prop("disabled", false);
        return;
    }

    if (Object.keys(USER_SELECTED_COMPANIES).length == 0) {
        alert("No companies have been selected to graph");
        $("#generate-button").removeClass("loading");
        $("#generate-button").prop("disabled", false);
        return;
    }

    $("#generate-button").addClass("loading");
    $("#generate-button").prop("disabled", true);
    $("#chart-details").hide();
    $("#scatterplot").empty();
    $('#graphErrorMessage').hide();


    try {
        let listOfBubbles = [];
        let allStockRequests = [];

        //foreach company selected make a web request
        for (let symbol of Object.keys(companiesSelected)) {
            allStockRequests.push(getStocksForSymbol(symbol));
        }

        console.log("Making request for all Stock Data");
        //TO-DO: Add error message on fail
        let stockResults = await Promise.all(allStockRequests); //perform request in parrallel
        console.log("Recieved Stock Data");
        for (let stockData of stockResults) {
            let symbol = stockData['Meta Data']['2. Symbol'];
            //for every article day lookup dates
            for (let id in SELECTED_ARTICLES) {
                let bubbleInfo = Object.assign({}, STOCK_MAP[symbol]);
                let publishDate = SELECTED_ARTICLES[id].pub_date;
                bubbleInfo.note = SELECTED_ARTICLES[id].headline.main;

                let dayChange = determineIntradayForStock(stockData, publishDate);
                let publishDateFormatted = new moment(publishDate).format("MM/DD/YY");
                if (!dayChange) {
                    //push an error
                    alert("Unable to generate bubble for " + symbol + " on " + publishDateFormatted)
                } else {
                    bubbleInfo.dayChange = determineIntradayForStock(stockData, publishDate);
                    bubbleInfo.eventDay = publishDateFormatted;
                    bubbleInfo.marketCapImpact = calculateImpactOnMarketCap(symbol, bubbleInfo.dayChange);
                    listOfBubbles.push(bubbleInfo);
                }
            }
        }

        LOCAL_TABLE = generateBubbleTable(listOfBubbles);
        let listOfTicks = generateYearlyQuarters(listOfBubbles); //actual tick values
        let tickNames = generateYearlyQuarterStrings(listOfBubbles); //tick string mappings
        let scatterPlotData = generateScatterPlotData(listOfBubbles);
        $("#chart-details").show();
        console.log("Plotting Data on graph . . .");
        drawScatterplot(scatterPlotData, listOfTicks, tickNames);
        generateShareableLink();

    } catch (ex) {
        console.error(ex);
        $('#graphErrorMessage').show();
    }


    $("#generate-button").removeClass("loading");
    $("#generate-button").prop("disabled", false);
}


function generateShareableLink() {
    console.log("Updating the URL ... ")

    let articleString = ''
    for (let key of Object.keys(SELECTED_ARTICLES)) {
        let article = SELECTED_ARTICLES[key]
        let identifier = article.headline.main + "-" + moment(article.pub_date).format("MM/DD/YYYY");
        articleString += identifier + "@!@"
    }

    let articleKey = Base64.encode(articleString);

    let symbols = [];
    for (let symbol of Object.keys(USER_SELECTED_COMPANIES)) {
        symbols.push(symbol)
    }
    console.log("URL Extension: ", 'index.html?symbols=' + symbols + '&events=' + articleKey);
    history.pushState('Generate Graph', 'Bombshell Stocks', '?symbols=' + symbols + '&events=' + articleKey);

}

function generateScatterPlotData(listOfBubbles) {

    let data = []
    for (let bubble of listOfBubbles) {
        let bubbleValue = {
            MarketCap: bubble.MarketCap,
            date: bubble.eventDay,
            company: bubble.Name,
            industry: bubble.Sector,
            priceChangePercent: bubble.dayChange,
            marketCapDecrease: bubble.marketCapImpact,
            note: bubble.note
        };
        data.push(bubbleValue);
    }

    return data;

}

function generateBubbleTable(listOfBubbles) {

    let row = [];
    let table = [['ID', 'X', 'Intraday Change', 'Industry', 'Volume']]
    let id = 1;
    for (let bubble of listOfBubbles) {
        row = [];
        row.push(bubble.Symbol + "-" + id++);
        row.push(new moment(bubble.eventDay, "YYYY-MM-DD").toDate());
        row.push(bubble.dayChange)
        row.push(bubble.Sector)
        row.push(bubble.marketCapImpact)
        table.push(row);
    }

    return table;

}

function generateYearlyQuarterStrings(listOfBubbles) {
    let listOfDates = {};
    let listOfTicksNames = []
    for (let bubble of listOfBubbles) {
        listOfDates[new moment(bubble.eventDay, "MM/DD/YY").year()] = {};
    }


    for (let year in listOfDates) {

        if (Object.keys(listOfDates).length < 2) {
            listOfTicksNames.push("Mar. " + year);
            listOfTicksNames.push("Oct. " + year);

        }

        listOfTicksNames.push("Jan. " + year);
        listOfTicksNames.push("Jun. " + year);
    }


    return listOfTicksNames;


}

function generateYearlyQuarters(listOfBubbles) {

    let listOfDates = {};
    let listOfTicks = []
    for (let bubble of listOfBubbles) {
        listOfDates[new moment(bubble.eventDay, "MM/DD/YY").year()] = {};
    }


    for (let year in listOfDates) {

        if (Object.keys(listOfDates).length < 2) {
            listOfTicks.push(new Date(year, 2));
            listOfTicks.push(new Date(year, 9));
        }

        listOfTicks.push(new Date(year, 0));
        listOfTicks.push(new Date(year, 5));
    }
    return listOfTicks;
}

function drawChart() {

    let data = google.visualization.arrayToDataTable(LOCAL_TABLE);

    var options = {
        animation: {
            duration: 1200,
            easing: "out"
        },
        vAxis: {
            title: "Stock Intraday % change after News",
            minValue: -1,
            textStyle: {
                color: 'black', fontName: 'Helvetica', bold: true
            },

        },
        height: 500,
        bubble: {
            textStyle: {
                auraColor: "none",
                stroke: "#000000",
                color: "transparent"
            }
        },
        hAxis: {
            gridlines: {
                color: "transparent"
            },
            slantedText: true,
            ticks: LOCAL_LISTOFTICKS,
            textStyle: {
                color: 'black', fontName: 'Helvetica'
            }

        }
    };

    let chart = new google.visualization.BubbleChart(document.getElementById('chart_div'));
    chart.draw(data, options);
}