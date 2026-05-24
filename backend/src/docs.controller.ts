import { Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SwaggerSyncService } from 'nestjs-swagger-sync/dist/swagger-sync/swagger-sync.service';

@ApiTags('docs')
@Controller('docs')
export class DocsController {
  constructor(private readonly swaggerSync: SwaggerSyncService) {}

  @Post('sync')
  @ApiOperation({ summary: 'Push the current OpenAPI spec to Postman' })
  async sync() {
    await this.swaggerSync.syncSwagger();
    return { message: 'Swagger documentation synced with Postman' };
  }
}
