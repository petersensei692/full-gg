import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PerformanceAnalyticsService } from './performance-analytics.service';

@ApiTags('analytics')
@Controller('analytics/performance-analytics')
export class PerformanceAnalyticsController {
  constructor(private readonly performanceAnalyticsService: PerformanceAnalyticsService) {}

  @Get()
  @ApiOperation({ summary: 'Performance calendar, charts, and yearly grid (R-based)' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'fromMs', required: false, description: 'Inclusive start as epoch ms (preferred over from)' })
  @ApiQuery({ name: 'toMs', required: false, description: 'Inclusive end as epoch ms (preferred over to)' })
  @ApiQuery({ name: 'calendarYear', required: false })
  @ApiQuery({ name: 'calendarMonth', required: false, description: '1-12' })
  @ApiQuery({ name: 'frequencyMode', required: false, enum: ['winsLosses', 'buysSells', 'profitR'] })
  @ApiQuery({ name: 'frequencyUnit', required: false, enum: ['daily', 'monthly'] })
  @ApiResponse({ status: 200 })
  getPerformance(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('fromMs') fromMs?: string,
    @Query('toMs') toMs?: string,
    @Query('calendarYear') calendarYear?: string,
    @Query('calendarMonth') calendarMonth?: string,
    @Query('frequencyMode') frequencyMode?: string,
    @Query('frequencyUnit') frequencyUnit?: string,
    @Query('pairs') pairs?: string,
    @Query('currencies') currencies?: string,
  ) {
    return this.performanceAnalyticsService.getPerformanceAnalytics({
      from,
      to,
      fromMs,
      toMs,
      calendarYear,
      calendarMonth,
      frequencyMode,
      frequencyUnit,
      pairs,
      currencies,
    });
  }
}
