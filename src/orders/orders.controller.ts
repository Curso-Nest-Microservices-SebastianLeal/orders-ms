import { Controller, ParseUUIDPipe } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto } from './dto';

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @MessagePattern({ cmd: 'create_order' })
  async createOrder(@Payload() createOrderDto: CreateOrderDto) {
    try {
      const product = await this.ordersService.createOrder(createOrderDto);
      return product;
    } catch (err) {
      throw err;
    }
  }

  @MessagePattern('findAllOrders')
  async findAllOrders(@Payload() orderPaginationDto: OrderPaginationDto) {
    try {
      return await this.ordersService.findAllOrders(orderPaginationDto);
    } catch (err) {
      throw err;
    }
  }

  @MessagePattern('findOneOrder')
  async findOneOrder(@Payload('id', ParseUUIDPipe) id: string) {
    try {
      return await this.ordersService.findOneOrder(id);
    } catch (err) {
      throw err;
    }
  }

  @MessagePattern('changeOrderStatus')
  changeOrderStatus(@Payload() changeOrderStatusDto: ChangeOrderStatusDto) {
    return this.ordersService.changeOrderStatus(changeOrderStatusDto)
  }

}
