import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { RoleName } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  VisibilityGuard,
  RequestWithVisibility,
} from '../../common/guards/visibility.guard';
import { ReportsService } from './reports.service';
import { ReportFilterDto } from './dto/report-filter.dto';

@Controller('reports')
@UseGuards(VisibilityGuard)
@Roles(
  RoleName.SYSTEM_ADMINISTRATOR,
  RoleName.SALES_MANAGER,
  RoleName.SALES_REPRESENTATIVE,
)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales/revenue')
  getSalesRevenue(
    @Query() filter: ReportFilterDto,
    @Request() req: RequestWithVisibility,
  ) {
    return this.reportsService.getSalesRevenue(filter, req.visibilityFilter);
  }

  @Get('sales/win-rate')
  getSalesWinRate(
    @Query() filter: ReportFilterDto,
    @Request() req: RequestWithVisibility,
  ) {
    return this.reportsService.getSalesWinRate(filter, req.visibilityFilter);
  }

  @Get('sales/conversion-rate')
  getSalesConversionRate(
    @Query() filter: ReportFilterDto,
    @Request() req: RequestWithVisibility,
  ) {
    return this.reportsService.getSalesConversionRate(
      filter,
      req.visibilityFilter,
    );
  }

  @Get('sales/opportunity-trends')
  getSalesOpportunityTrends(
    @Query() filter: ReportFilterDto,
    @Request() req: RequestWithVisibility,
  ) {
    return this.reportsService.getSalesOpportunityTrends(
      filter,
      req.visibilityFilter,
    );
  }

  @Get('customers/growth')
  getCustomerGrowth(
    @Query() filter: ReportFilterDto,
    @Request() req: RequestWithVisibility,
  ) {
    return this.reportsService.getCustomerGrowth(filter, req.visibilityFilter);
  }

  @Get('customers/distribution')
  getCustomerDistribution(
    @Query() filter: ReportFilterDto,
    @Request() req: RequestWithVisibility,
  ) {
    return this.reportsService.getCustomerDistribution(
      filter,
      req.visibilityFilter,
    );
  }

  @Get('customers/industry-analysis')
  getCustomerIndustryAnalysis(
    @Query() filter: ReportFilterDto,
    @Request() req: RequestWithVisibility,
  ) {
    return this.reportsService.getCustomerIndustryAnalysis(
      filter,
      req.visibilityFilter,
    );
  }

  @Get('productivity/activity-completion')
  getProductivityActivityCompletion(
    @Query() filter: ReportFilterDto,
    @Request() req: RequestWithVisibility,
  ) {
    return this.reportsService.getProductivityActivityCompletion(
      filter,
      req.visibilityFilter,
    );
  }

  @Get('productivity/task-completion')
  getProductivityTaskCompletion(
    @Query() filter: ReportFilterDto,
    @Request() req: RequestWithVisibility,
  ) {
    return this.reportsService.getProductivityTaskCompletion(
      filter,
      req.visibilityFilter,
    );
  }

  @Get('productivity/opportunity-ownership')
  getProductivityOpportunityOwnership(
    @Query() filter: ReportFilterDto,
    @Request() req: RequestWithVisibility,
  ) {
    return this.reportsService.getProductivityOpportunityOwnership(
      filter,
      req.visibilityFilter,
    );
  }

  @Get(':reportType/export')
  async exportReport(
    @Param('reportType') reportType: string,
    @Query() filter: ReportFilterDto,
    @Request() req: RequestWithVisibility,
    @Res() res: Response,
  ) {
    const data = await this.getReportData(
      reportType,
      filter,
      req.visibilityFilter,
    );
    const rows = Array.isArray(data)
      ? data
      : Object.entries(data).map(([k, v]) => ({
          key: k,
          value: JSON.stringify(v),
        }));

    const headers = rows.length ? Object.keys(rows[0] as object).join(',') : '';
    const csvRows = rows.map((row: any) =>
      Object.values(row)
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    const csv = [headers, ...csvRows].join('\n');

    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="report-${reportType}-${date}.csv"`,
    );
    res.send(csv);
  }

  private async getReportData(
    reportType: string,
    filter: ReportFilterDto,
    visibility: any,
  ) {
    switch (reportType) {
      case 'sales-revenue':
        return this.reportsService.getSalesRevenue(filter, visibility);
      case 'sales-win-rate':
        return this.reportsService.getSalesWinRate(filter, visibility);
      case 'sales-conversion':
        return this.reportsService.getSalesConversionRate(filter, visibility);
      case 'sales-opportunity-trends':
        return this.reportsService.getSalesOpportunityTrends(
          filter,
          visibility,
        );
      case 'customers-growth':
        return this.reportsService.getCustomerGrowth(filter, visibility);
      case 'customers-distribution':
        return this.reportsService.getCustomerDistribution(filter, visibility);
      case 'customers-industry':
        return this.reportsService.getCustomerIndustryAnalysis(
          filter,
          visibility,
        );
      case 'productivity-activity':
        return this.reportsService.getProductivityActivityCompletion(
          filter,
          visibility,
        );
      case 'productivity-task':
        return this.reportsService.getProductivityTaskCompletion(
          filter,
          visibility,
        );
      case 'productivity-opportunity':
        return this.reportsService.getProductivityOpportunityOwnership(
          filter,
          visibility,
        );
      default:
        return [];
    }
  }
}
