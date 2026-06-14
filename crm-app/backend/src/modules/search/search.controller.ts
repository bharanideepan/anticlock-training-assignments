import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import {
  VisibilityGuard,
  RequestWithVisibility,
} from '../../common/guards/visibility.guard';
import { SearchService } from './search.service';

@Controller('search')
@UseGuards(VisibilityGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Query('q') q: string,
    @Query('types') types: string,
    @Query('pageSize') pageSize: string,
    @Request() req: RequestWithVisibility,
  ) {
    return this.searchService.search(
      q ?? '',
      Number(pageSize) || 10,
      req.visibilityFilter,
      types,
    );
  }
}
