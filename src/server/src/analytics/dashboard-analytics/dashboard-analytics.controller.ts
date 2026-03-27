import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DashboardAnalyticsService } from './dashboard-analytics.service';

@ApiTags('analytics')
@Controller('analytics/dashboard-analytics')
export class DashboardAnalyticsController {
  constructor(private readonly dashboardAnalyticsService: DashboardAnalyticsService) {}

  @Get()
  @ApiOperation({ summary: 'Get dashboard analytics metrics and chart data' })
  @ApiQuery({ name: 'tradeCountRange', required: false, enum: ['1D', '1W', '1M', '1Y', 'ALL'] })
  @ApiQuery({ name: 'resultRange', required: false, enum: ['1D', '1W', '1M', '1Y', 'ALL'] })
  @ApiQuery({ name: 'from', required: false, description: 'Custom ISO start datetime' })
  @ApiQuery({ name: 'to', required: false, description: 'Custom ISO end datetime' })
  @ApiResponse({ status: 200, description: 'Dashboard analytics payload.' })
  getDashboardAnalytics(
    @Query('tradeCountRange') tradeCountRange?: string,
    @Query('resultRange') resultRange?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.dashboardAnalyticsService.getDashboardAnalytics({
      tradeCountRange,
      resultRange,
      from,
      to,
    });
  }
}
