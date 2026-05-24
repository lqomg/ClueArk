import { Global, Module } from '@nestjs/common';
import { VectorStoreService } from './vector-store.service';

@Global()
@Module({
  providers: [VectorStoreService],
  exports: [VectorStoreService],
})
export class VectorStoreModule {}
