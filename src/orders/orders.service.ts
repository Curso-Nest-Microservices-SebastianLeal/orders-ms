import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto } from './dto';
import { NATS_SERVICE } from 'src/config/services';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger('OrdersService');

  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {
    super();
  }

  async onModuleInit() {
    this.$connect();
    this.logger.log('Database connected');
  }

  async createOrder(createOrderDto: CreateOrderDto) {
    try {
      // 1 Confirmar los ids de los productos
      const productsIds = createOrderDto.items.map((item) => item.productId)

      const products: any[] = await this.getProductList(productsIds);

      //2. Calculos de los valores

      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
        const price = products.find(product => product.id === orderItem.productId).price;

        return price * orderItem.quantity;
      }, 0);


      const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
        return acc + orderItem.quantity;
      }, 0)


      //3. Crear una transaccion de BD

      const order = await this.order.create({
        data: {
          totalAmount: totalAmount,
          totalItems: totalItems,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map((orderItem) => ({
                price: products.find(prod => prod.id === orderItem.productId).price,
                productId: orderItem.productId,
                quantity: orderItem.quantity
              }))
            }
          }
        },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true
            }
          }
        }
      });

      return {
        ...order,
        OrderItem: order.OrderItem.map((orderItem) => ({
          ...orderItem,
          name: products.find(product => product.id === orderItem.productId).name
        }))
      };

    } catch (err) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Something went wrong. Check logs'
      });
    }
  }

  async findAllOrders(orderPaginationDto: OrderPaginationDto) {

    const { status, page, limit } = orderPaginationDto;

    const totalPages = await this.order.count({
      where: { status: orderPaginationDto.status }
    });

    return {
      data: await this.order.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: {
          status: status
        },
      }),
      meta: {
        total: totalPages,
        page: page,
        lastPage: Math.ceil(totalPages / limit)
      }
    }
  }

  async findOneOrder(id: string) {
    try {

      const order = await this.order.findFirst({
        where: { id },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true
            }
          }
        }
      });

      if (!order) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Order with id ${id} not found`
        });
      }

      const productsIds = order.OrderItem.map((orderItem) => orderItem.productId)

      const productsList = await this.getProductList(productsIds);

      return {
        ...order,
        OrderItem: order.OrderItem.map((orderItem) => ({
          ...orderItem,
          name: productsList.find((product) => product.id === orderItem.productId).name
        }))
      };

    } catch (err) {
      throw err;
    }
  }

  async changeOrderStatus(changeOrderStatusDto: ChangeOrderStatusDto) {

    const { id, status } = changeOrderStatusDto;

    const order = await this.findOneOrder(id);

    if (order.status === status) {
      return order;
    }

    return this.order.update({
      where: { id },
      data: { status }
    });

  }

  private async getProductList(productsIds: number[]) {

    try {
      return await firstValueFrom(
        this.client.send({ cmd: 'validate_products' }, productsIds)
      );
    } catch (err) {
      throw err;
    }

  }
}