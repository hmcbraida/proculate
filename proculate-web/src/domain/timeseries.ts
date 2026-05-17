export type TimeSeries = {
  readonly times: ReadonlyArray<number>;
  readonly values: ReadonlyArray<number>;
};

export type MultiTimeSeries = {
  readonly times: ReadonlyArray<number>;
  readonly components: ReadonlyArray<ReadonlyArray<number>>;
};
