CREATE TABLE "room_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "ck_room_messages_body" CHECK (char_length("room_messages"."body") between 1 and 280)
);
--> statement-breakpoint
ALTER TABLE "room_messages" ADD CONSTRAINT "room_messages_room_id_game_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."game_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_messages" ADD CONSTRAINT "room_messages_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_room_messages_room_created" ON "room_messages" USING btree ("room_id","created_at");
--> statement-breakpoint
ALTER TABLE "room_messages" ENABLE ROW LEVEL SECURITY;
