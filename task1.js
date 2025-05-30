const cheerio = require("cheerio");
const axios = require("axios");
const fs = require("fs");
const {contains} = require("cheerio");
const {get} = require("axios");

// Course Descriptions
if (false) {
    // https://bulletin.du.edu/undergraduate/coursedescriptions/comp/
    let results = []

    axios.get('https://bulletin.du.edu/undergraduate/coursedescriptions/comp/')
        .then((response) => {
            // console.log(response.data);
            const $ = cheerio.load(response.data);
            $('.sc_sccoursedescs .courseblock').each((index, course) => {
                let courseNumber = parseInt($(course).find('.courseblocktitle').text().slice(5, 9))
                if (courseNumber >= 3000) {
                    let courseTitle = $(course).find('.courseblocktitle').text()
                    let courseDesc = $(course).find('.courseblockdesc').text()
                    if (courseDesc.search('Prerequisite') < 0) {
                        results.push({
                            "course": "COMP-" + String(courseNumber),
                            "title": courseTitle
                        })
                        console.log(courseNumber);
                        console.log(courseDesc);

                    }
                }

            });

            fs.writeFile('bulletin.json', JSON.stringify({"courses": results}), 'utf8', (err) => {
                if (err) throw err;
            });

            // let courseTitle = courses.find('.courseblocktitle')
            // console.log(courseTitle.text());
            // console.log(courses.html());
            // let headerLinks = navDiv.find('a');
            // headerLinks.each((index, element) => {
            //     console.log($(element).attr('href'));
            // })
        })
        .catch((error) => {
            console.error('Error occured', error);
        })
}

let athleticsEvents = []
//Athletics Website
if (false) {
    axios.get('https://denverpioneers.com/index.aspx')
        .then((response) => {
            const $ = cheerio.load(response.data);
            let data = $('section script:contains("opponent")').text();
            data = data.substring(15, data.indexOf(';'))
            let jsonData = JSON.parse(data)['data'];

            jsonData.entries(jsonData).forEach((entry) => {
                let event = entry[1]

                athleticsEvents.push({
                    'duTeam': event['sport']['title'],
                    'opponent': event['opponent']['name'],
                    'date': event['date']
                })
                // console.log(event['sport']['title']);
                // console.log(event['opponent']['name']);
                // console.log(event['date']);
            })

            fs.writeFile('athletic_events.json', JSON.stringify({"events": athleticsEvents}), 'utf8', (err) => {
                if (err) throw err;
            });


        });
}

let calendarEvents = [];


// Calendar Events
main();

async function main() {
    const response = await axios('https://www.du.edu/calendar?search=&start_date=2025-01-01&end_date=2025-12-31#events-listing-date-filter-anchor');
    const $ = cheerio.load(response.data);
    const events = [];

    $('.event-card').each((index, element) => {
        let eventURL = $(element).attr('href');
        let eventTitle = $(element)[0]['children'][3]['children'][0]['data'].trim();
        let eventDate = $(element)[0]['children'][1]['children'][0]['data'].trim();
        let eventTime = null;
        if ($(element)[0]['children'].length > 7) {
            eventTime = $(element)[0]['children'][5]['children'][1]['data'].trim();
        }
        events.push({eventTitle, eventDate, eventTime, eventURL});
        // console.log(events);
    });

    const eventsNeedingDesc = events.map(e => () => getEventDescription(e.eventTitle, e.eventDate, e.eventTime, e.eventURL));

    await runRequests(eventsNeedingDesc);

    fs.writeFileSync('calendar_events.json', JSON.stringify({"events": calendarEvents}), 'utf8', (err) => {
        if (err) throw err;
    });
}

async function runRequests(events) {
    const running = new Set();

    for (const event of events) {
        const p = event().finally(() => running.delete(p));
        running.add(p);

        if (running.size >= 5) {
            await Promise.race(running);
        }
    }

    await Promise.all(running);
}


async function getEventDescription(eventTitle, eventDate, eventTime, eventURL) {
    try {
        const response = await axios.get(eventURL);
        const $ = cheerio.load(response.data);
        let eventDescription = $('.description').text().trim()
        console.log(eventDescription);
        calendarEvents.push({
            'title': eventTitle,
            'date': eventDate,
            'time': eventTime,
            'description': eventDescription,
        })
    } catch (error) {
        console.error(error);
    }
}