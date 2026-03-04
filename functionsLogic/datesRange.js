function getDatesRange(firstDate, secondDate) {
    const datesRange = [];
    let index = 0;

    while (IsFirstSooner(firstDate, secondDate)) {
        datesRange[index] = fixDate(firstDate);
        index++;
        changeDateToNextDay(firstDate);
    }

    datesRange[index] = fixDate(secondDate);

    return (datesRange);
}

function IsFirstSooner(fromDate, untilDate) {
    if (fromDate.year < untilDate.year) {
        return (true);
    } else if (fromDate.year > untilDate.year) {
        return (false);
    } else {
        if (fromDate.month < untilDate.month) {
            return (true);
        } else if (fromDate.month > untilDate.month) {
            return (false);
        } else {
            return (fromDate.day < untilDate.day);
        }
    }
}

function changeDateToNextDay(date) {
    date.day++;

    if (date.day === 32) {
        date.month++;
        date.day = 1;

        if (date.month === 13) {
            date.year++;
            date.month = 1;
        }
    }
}

function fixDate(date) {
    let expirationDate = '';

    if (date.day < 10) {
        expirationDate = '0';
    }

    expirationDate += date.day + '/';

    if (date.month < 10) {
        expirationDate += '0';
    }

    expirationDate += date.month + '/' + date.year;

    return (expirationDate);
}

function turnToRegExpRange(datesRange) {
    let findString = [];
    let newField;
    datesRange.find((date) => {
        newField = {};
        newField['date'] = new RegExp(date);
        findString[findString.length] = newField;
    });

    return (findString);
}

module.exports.getDatesRange = getDatesRange;
module.exports.IsFirstSooner = IsFirstSooner;
module.exports.turnToRegExpRange = turnToRegExpRange;