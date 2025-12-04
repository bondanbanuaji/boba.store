CREATE TYPE "public"."role" AS ENUM('user', 'admin', 'reseller');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"action" varchar(50) NOT NULL,
	"table_name" varchar(50) NOT NULL,
	"record_id" text,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"user_id" text,
	"product_id" uuid,
	"target_id" varchar(100) NOT NULL,
	"target_name" varchar(100),
	"target_server" varchar(50),
	"product_name" text NOT NULL,
	"product_sku" varchar(100),
	"quantity" integer DEFAULT 1,
	"unit_price" numeric(15, 2) NOT NULL,
	"discount" numeric(15, 2) DEFAULT '0',
	"admin_fee" numeric(15, 2) DEFAULT '0',
	"total_price" numeric(15, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"payment_status" varchar(20) DEFAULT 'unpaid',
	"payment_method" varchar(50),
	"provider_trx_id" varchar(100),
	"provider_status" varchar(50),
	"provider_sn" text,
	"provider_message" text,
	"payment_id" varchar(100),
	"payment_url" text,
	"payment_expired_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"notes" text,
	"ip_address" "inet",
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"completed_at" timestamp with time zone,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number"),
	CONSTRAINT "quantity_check" CHECK ("orders"."quantity" >= 1),
	CONSTRAINT "unit_price_check" CHECK ("orders"."unit_price" >= 0),
	CONSTRAINT "discount_check" CHECK ("orders"."discount" >= 0),
	CONSTRAINT "admin_fee_check" CHECK ("orders"."admin_fee" >= 0),
	CONSTRAINT "total_price_check" CHECK ("orders"."total_price" >= 0),
	CONSTRAINT "status_check" CHECK ("orders"."status" IN ('pending', 'processing', 'success', 'failed', 'cancelled', 'refunded')),
	CONSTRAINT "payment_status_check" CHECK ("orders"."payment_status" IN ('unpaid', 'pending', 'paid', 'expired', 'refunded')),
	CONSTRAINT "valid_total" CHECK ("orders"."total_price" = ("orders"."unit_price" * "orders"."quantity") - "orders"."discount" + "orders"."admin_fee")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" varchar(50) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"name" text NOT NULL,
	"slug" varchar(100) NOT NULL,
	"sku" varchar(100),
	"price" numeric(15, 2) NOT NULL,
	"discount" numeric(15, 2) DEFAULT '0',
	"description" text,
	"image_url" text,
	"is_active" boolean DEFAULT true,
	"stock_status" varchar(20) DEFAULT 'available',
	"min_qty" integer DEFAULT 1,
	"max_qty" integer DEFAULT 100,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "products_sku_unique" UNIQUE("sku"),
	CONSTRAINT "category_check" CHECK ("products"."category" IN ('game', 'pulsa', 'ewallet', 'pln', 'voucher')),
	CONSTRAINT "price_check" CHECK ("products"."price" > 0),
	CONSTRAINT "discount_check" CHECK ("products"."discount" >= 0),
	CONSTRAINT "valid_discount" CHECK ("products"."discount" <= "products"."price"),
	CONSTRAINT "stock_status_check" CHECK ("products"."stock_status" IN ('available', 'limited', 'empty')),
	CONSTRAINT "min_qty_check" CHECK ("products"."min_qty" >= 1),
	CONSTRAINT "max_qty_check" CHECK ("products"."max_qty" >= 1),
	CONSTRAINT "valid_qty_range" CHECK ("products"."max_qty" >= "products"."min_qty")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"full_name" text,
	"phone" varchar(15),
	"balance" numeric(15, 2) DEFAULT '0',
	"role" varchar(20) DEFAULT 'user',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "balance_check" CHECK ("profiles"."balance" >= 0),
	CONSTRAINT "role_check" CHECK ("profiles"."role" IN ('user', 'admin', 'reseller'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"value_type" varchar(20) DEFAULT 'string',
	"description" text,
	"is_public" boolean DEFAULT false,
	"updated_at" timestamp with time zone DEFAULT now(),
	"updated_by" text,
	CONSTRAINT "value_type_check" CHECK ("settings"."value_type" IN ('string', 'number', 'boolean', 'json'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"order_id" uuid,
	"type" varchar(20) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"balance_before" numeric(15, 2) NOT NULL,
	"balance_after" numeric(15, 2) NOT NULL,
	"description" text,
	"reference_id" varchar(100),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "type_check" CHECK ("transactions"."type" IN ('topup', 'purchase', 'refund', 'bonus', 'adjustment')),
	CONSTRAINT "valid_balance_change" CHECK ("transactions"."balance_after" = "transactions"."balance_before" + "transactions"."amount")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_user_id_fk" FOREIGN KEY ("id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_account_user_id" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_account_provider" ON "account" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_user_id" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_table_name" ON "audit_logs" USING btree ("table_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_created_at" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_user_id" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_order_number" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_status" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_payment_status" ON "orders" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_created_at" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_user_created" ON "orders" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_status_created" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_provider_trx" ON "orders" USING btree ("provider_trx_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_admin_view" ON "orders" USING btree ("status","payment_status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_products_category" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_products_provider" ON "products" USING btree ("provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_products_slug" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_products_sku" ON "products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_products_is_active" ON "products" USING btree ("is_active") WHERE "products"."is_active" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_products_category_active" ON "products" USING btree ("category","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_profiles_role" ON "profiles" USING btree ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_profiles_phone" ON "profiles" USING btree ("phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_session_user_id" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_session_token" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_session_expires_at" ON "session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_settings_is_public" ON "settings" USING btree ("is_public") WHERE "settings"."is_public" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transactions_user_id" ON "transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transactions_order_id" ON "transactions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transactions_type" ON "transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transactions_created_at" ON "transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transactions_user_created" ON "transactions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_email" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_created_at" ON "user" USING btree ("created_at");