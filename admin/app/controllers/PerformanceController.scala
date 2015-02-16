package controllers.admin

import com.amazonaws.regions.{Regions, Region}
import com.amazonaws.services.dynamodbv2.AmazonDynamoDBAsyncClient
import awswrappers.dynamodb._
import com.amazonaws.services.dynamodbv2.model._
import common.ExecutionContexts
import org.joda.time.{ DateTime }
import scala.collection.JavaConversions._
import scala.concurrent.Future
import scala.util.Try
import play.api.mvc.{Action, Controller}
import common.{ExecutionContexts, JsonComponent}
import play.api.libs.json.Json

import scalaz.std.list._
import scalaz.std.anyVal._
import scalaz.std.map._
import scalaz.std.tuple._
import scalaz.syntax.traverse._

object PerformanceBenchmark extends ExecutionContexts {
  private val TableName = "perf"
  private val dynamoDbClient = new AmazonDynamoDBAsyncClient()
  dynamoDbClient.setRegion(Region.getRegion(Regions.EU_WEST_1))

  def get30days(): Future[Seq[String]] = {
    dynamoDbClient.scanFuture(new ScanRequest()
      .withTableName(TableName)
      .withScanFilter(Map[String, Condition](
      "timestamp" -> new Condition()
        .withComparisonOperator(ComparisonOperator.GE)
        .withAttributeValueList(new AttributeValue().withN("0"))
    ))
    ) map { response =>
      response.getItems map { item =>
        item.toString()
      }
    }
  }
}


object PerformanceController extends Controller with ExecutionContexts {

  def index = Action.async { implicit request =>
    PerformanceBenchmark.get30days() map { benchmarks =>
      JsonComponent.forJsValue(Json.toJson(benchmarks))
    }
  }

}
