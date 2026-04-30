export type AggregationPolicyDto = {
  lookbackDays: number;
  maxPairHours: number;
  simTitle: number;
  simFull: number;
  maxItems: number;
  embeddingBatchSize: number;
  clusterCronDisabled: boolean;
  persisted: boolean;
};
