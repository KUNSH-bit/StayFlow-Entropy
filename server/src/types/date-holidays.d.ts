declare module "date-holidays" {
  export interface Holiday {
    date: string;
    start: Date;
    end: Date;
    name: string;
    type: string;
    rule: string;
    substitute: boolean;
  }

  export default class Holidays {
    constructor(country: string);
    getHolidays(year: number): Holiday[];
  }
}
