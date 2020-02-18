import { formatShorthandNumbers } from "./format";
import { billion, million, thousand, zero } from "../zero";
import { BigNumber } from "bignumber.js";

describe("Formatting numbers as shorthand ones", () => {
    beforeEach(() => {
        BigNumber.config({ EXPONENTIAL_AT: [-20, 20] })
    })

    it('should format billions', () => {
        const number = new BigNumber(123.45).times(billion);
        expect(formatShorthandNumbers(number)).toEqual('123.45B');
    });

    it('should format billions with no precision', () => {
        const number = new BigNumber(123.45).times(billion);
        expect(formatShorthandNumbers(number, 0)).toEqual('123B');
    })

    it('should format billions with custom precision', () => {
        const number = new BigNumber(123.67801).times(billion);
        expect(formatShorthandNumbers(number, 5)).toEqual('123.67801B');
    })

    it('should format billions and remove trailing zeroes', () => {
        const number = new BigNumber(123.6780000).times(billion);
        expect(formatShorthandNumbers(number, 5)).toEqual('123.678B');
    })

     // tslint:disable-next-line:max-line-length
    it('should format billions and remove trailing zeroes if any after precicion format on number with digits after the precision point', () => {
        const number = new BigNumber(23.45900002).times(billion);
        expect(formatShorthandNumbers(number, 5)).toEqual('23.459B');
    })

    it('should format millions', () => {
        const number = new BigNumber(999.999).times(million);
        expect(formatShorthandNumbers(number)).toEqual('999.999M');
    });

    it('should format millions with no precision', () => {
        const number = new BigNumber(999.999).times(million);
        expect(formatShorthandNumbers(number, 0)).toEqual('999M');
    })

    it('should format millions with custom precision', () => {
        const number = new BigNumber(999.12345).times(million);
        expect(formatShorthandNumbers(number, 2)).toEqual('999.12M');
    })

    it('should format millions and remove trailing zeroes', () => {
        const number = new BigNumber(999.6780000).times(million);
        expect(formatShorthandNumbers(number, 5)).toEqual('999.678M');
    })

     // tslint:disable-next-line:max-line-length
    it('should format millions and remove trailing zeroes if any after precicion format on number with digits after the precision point', () => {
        const number = new BigNumber(243.45900002).times(million);
        expect(formatShorthandNumbers(number, 5)).toEqual('243.459M');
    })

    it('should format thousands', () => {
        const number = new BigNumber(123.4567).times(thousand);
        expect(formatShorthandNumbers(number)).toEqual('123.4567K');
    })

    it('should format thousands with no precision', () => {
        const number = new BigNumber(12.12).times(thousand);
        expect(formatShorthandNumbers(number, 0)).toEqual('12K');
    })

    it('should format thousands with custom precision', () => {
        const number = new BigNumber(12.002).times(thousand);
        expect(formatShorthandNumbers(number, 6)).toEqual('12.002K');
    })

    it('should format thousands and remove trailing zeroes', () => {
        const number = new BigNumber(23.459000000).times(thousand);
        expect(formatShorthandNumbers(number, 5)).toEqual('23.459K');
    })

     // tslint:disable-next-line:max-line-length
    it('should format thousands and remove trailing zeroes if any after precicion format on number with digits after the precision point', () => {
        const number = new BigNumber(23.45900002).times(thousand);
        expect(formatShorthandNumbers(number, 5)).toEqual('23.459K');
    })

    it('should not shorthand the number', () => {
        const number = new BigNumber(923.45900002);
        expect(formatShorthandNumbers(number)).toEqual('923.45900002');
    })

    it('should not shorthand the number but remove trailing zeroes', () => {
        const number = new BigNumber(923.459000);
        expect(formatShorthandNumbers(number)).toEqual('923.459');
    })

    it('should not shorthand the number but format to precision and remove trailing zeroes if any', () => {
        const number = new BigNumber(923.45900002);
        expect(formatShorthandNumbers(number, 4)).toEqual('923.459');
    })

    it('should format 0', () => {
        expect(formatShorthandNumbers(zero, 4)).toEqual('0');
    })

    it('should format numbers bigger than billion', () => {
        const trillion = new BigNumber('1000000000000')
        expect(formatShorthandNumbers(trillion)).toEqual('1000B');
    })

    it('should format numbers bigger than billion with precision', () => {
        const trillion = new BigNumber('1000045600000')
        expect(formatShorthandNumbers(trillion, 2)).toEqual('1000.04B');
    })
})

