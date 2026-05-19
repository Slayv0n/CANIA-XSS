using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaskDb.Migrations
{
    /// <inheritdoc />
    public partial class AddReportContent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ReportContent",
                table: "Tasks",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReportContent",
                table: "Tasks");
        }
    }
}
