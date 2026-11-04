using BingoBoard.Data;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BingoBoard.Data.Migrations;

[Migration("20261104000000_AddSquareDescription")]
public partial class AddSquareDescription : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "Description",
            table: "BingoSquares",
            type: "character varying(280)",
            maxLength: 280,
            nullable: false,
            defaultValue: "");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "Description", table: "BingoSquares");
    }
}
