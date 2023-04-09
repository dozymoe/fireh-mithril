import { endOfYear, format, isValid, parse, startOfYear } from 'date-fns/esm';
import { toDate } from 'date-fns-tz';
import { isObject } from 'lodash';


export default class DateParser
{
    constructor(formats)
    {
        this.formats = formats;
    }

    isValid(value)
    {
        return isValid(value);
    }

    serializeDateTime(value)
    {
        if (!value || !this.isValid(value)) return '';
        return format(value, this.formats.SERIALIZED_DATETIME_FORMAT);
    }

    deserializeDateTime(value)
    {
        if (value instanceof Date) return value;
        if (isObject(value))
        {
            return toDate(value.date, {timeZone: value.timezone});
        }
        return parse(value, this.formats.SERIALIZED_DATETIME_FORMAT,
                new Date());
    }

    serializeDate(value)
    {
        if (!value || !this.isValid(value)) return '';
        return format(value, this.formats.SERIALIZED_DATE_FORMAT);
    }

    deserializeDate(value)
    {
        if (value instanceof Date) return value;
        return parse(value, this.formats.SERIALIZED_DATE_FORMAT, new Date());
    }

    formatDateTime(value)
    {
        if (!value || !this.isValid(value)) return '';
        return format(value, this.formats.DATETIME_FORMAT);
    }

    parseDateTime(value)
    {
        if (value instanceof Date) return value;
        return parse(value, this.formats.DATETIME_FORMAT, new Date());
    }

    formatDate(value)
    {
        if (!value || !this.isValid(value)) return '';
        return format(value, this.formats.DATE_FORMAT);
    }

    parseDate(value)
    {
        if (value instanceof Date) return value;
        return parse(value, this.formats.DATE_FORMAT, new Date());
    }

    formatMonth(value)
    {
        if (!value || !this.isValid(value)) return '';
        return format(value, this.formats.MONTH_FORMAT);
    }

    parseMonth(value)
    {
        if (value instanceof Date) return value;
        return parse(value, this.formats.MONTH_FORMAT, new Date());
    }

    endOfYear(value)
    {
        return endOfYear(value);
    }

    endOfYearFromYear(value)
    {
        return endOfYear(parse(value, 'yyyy', new Date()));
    }

    startOfYear(value)
    {
        return startOfYear(value);
    }

    startOfYearFromYear(value)
    {
        return startOfYear(parse(value, 'yyyy', new Date()));
    }
}
