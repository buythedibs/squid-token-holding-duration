import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, Index as Index_} from "typeorm"
import * as marshal from "./marshal"

@Entity_()
export class Account {
    constructor(props?: Partial<Account>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @Column_("text", {nullable: false})
    wallet!: string

    @Index_()
    @Column_("text", {nullable: false})
    token!: string

    @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
    balance!: bigint

    @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
    averageBalance!: bigint

    @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
    updatedAt!: bigint
}
